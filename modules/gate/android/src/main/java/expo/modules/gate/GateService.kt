package expo.modules.gate

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.os.Build
import android.os.PowerManager

/** Lock state shared by the service, the verse screen and the JS module. */
object Gate {
  const val COOLDOWN_MS = 15 * 60_000L

  private fun prefs(c: Context) = c.getSharedPreferences("gate", Context.MODE_PRIVATE)

  fun enabled(c: Context) = prefs(c).getBoolean("enabled", false)

  fun setEnabled(c: Context, on: Boolean) {
    prefs(c).edit().putBoolean("enabled", on).apply()
    if (on) GateService.start(c) else GateService.stop(c)
  }

  fun startCooldown(c: Context) =
    prefs(c).edit().putLong("until", System.currentTimeMillis() + COOLDOWN_MS).apply()

  /** True when the verse should show. A cooldown longer than 15 min means the clock was set back: ignore it. */
  fun due(c: Context): Boolean {
    val left = prefs(c).getLong("until", 0) - System.currentTimeMillis()
    return left <= 0 || left > COOLDOWN_MS
  }

  fun open(c: Context) =
    c.startActivity(Intent(c, GateActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))

  fun unlockedAndAwake(c: Context) =
    c.getSystemService(PowerManager::class.java).isInteractive &&
      !c.getSystemService(KeyguardManager::class.java).isKeyguardLocked

  /** Ringing, in a call (phone or VoIP) or an alarm going off: never cover those. */
  fun busy(c: Context): Boolean {
    val am = c.getSystemService(AudioManager::class.java)
    return am.mode != AudioManager.MODE_NORMAL ||
      am.activePlaybackConfigurations.any { it.audioAttributes.usage == AudioAttributes.USAGE_ALARM }
  }
}

/** Always-on service that opens the verse screen when the screen turns on (over the lock screen) or after unlock. */
class GateService : Service() {
  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
      if (i.action == Intent.ACTION_SCREEN_OFF) return Blocker.hide()
      // SCREEN_ON shows it on top of the lock screen; USER_PRESENT is the backup if it was skipped past.
      if (Gate.due(c) && !Gate.busy(c)) Gate.open(c)
    }
  }

  override fun onBind(intent: Intent?) = null

  override fun onCreate() {
    super.onCreate()
    try {
      if (Build.VERSION.SDK_INT >= 34) {
        startForeground(1, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(1, notification())
      }
    } catch (e: Exception) {
      // Android refused a background restart; the app or the next boot starts it again.
      stopSelf()
      return
    }
    registerReceiver(receiver, IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_ON)
      addAction(Intent.ACTION_SCREEN_OFF)
      addAction(Intent.ACTION_USER_PRESENT)
    })
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) = START_STICKY

  override fun onDestroy() {
    runCatching { unregisterReceiver(receiver) }
    Blocker.hide()
    super.onDestroy()
  }

  private fun notification(): Notification {
    getSystemService(NotificationManager::class.java)
      .createNotificationChannel(NotificationChannel("gate", "Verse lock", NotificationManager.IMPORTANCE_LOW))
    val open = PendingIntent.getActivity(
      this, 0, packageManager.getLaunchIntentForPackage(packageName), PendingIntent.FLAG_IMMUTABLE
    )
    return Notification.Builder(this, "gate")
      .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
      .setContentTitle("Bible Unlock is on")
      .setContentText("A verse will greet you when you open your phone.")
      .setContentIntent(open)
      .setOngoing(true)
      .build()
  }

  companion object {
    fun start(c: Context) = c.startForegroundService(Intent(c, GateService::class.java))
    fun stop(c: Context) = c.stopService(Intent(c, GateService::class.java))
  }
}

/** Restarts the service after a reboot or an app update. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(c: Context, i: Intent) {
    if (Gate.enabled(c)) GateService.start(c)
  }
}
