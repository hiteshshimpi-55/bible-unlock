package expo.modules.gate

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/** Hosts the "gate" JS component (src/GateScreen.tsx), shown on top of the lock screen. */
class GateActivity : ReactActivity() {
  private var done = false

  override fun getMainComponentName() = "gate"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onStart() {
    super.onStart()
    Blocker.hide()
  }

  override fun onStop() {
    super.onStop()
    // Left for Home, Recents or another app without finishing: cover whatever they opened.
    if (!done && !isChangingConfigurations) Blocker.show(this)
  }

  /** Verse finished, skipped, or Emergency: start the cooldown, bring up the PIN prompt, then get out of the way. */
  fun unlock(dialer: Boolean) {
    done = true
    Gate.startCooldown(this)
    val leave = { unlocked: Boolean ->
      if (unlocked && dialer) startActivity(Intent(Intent.ACTION_DIAL))
      finish()
    }
    val keyguard = getSystemService(KeyguardManager::class.java)
    if (!keyguard.isKeyguardLocked) return leave(true)
    keyguard.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
      override fun onDismissSucceeded() = leave(true)
      // Cancelled PIN: they're back on the normal lock screen, which has its own emergency call button.
      override fun onDismissCancelled() = leave(false)
      override fun onDismissError() = leave(false)
    })
  }
}

/** Full-screen "Your verse is waiting" cover, shown when someone leaves the verse screen unfinished. */
object Blocker {
  private var view: View? = null
  private val main = Handler(Looper.getMainLooper())

  fun show(c: Context) {
    val app = c.applicationContext
    if (view != null || !Settings.canDrawOverlays(app) || !Gate.unlockedAndAwake(app) || Gate.busy(app)) return
    val dp = app.resources.displayMetrics.density
    val root = LinearLayout(app).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#0E0D0B"))
      addView(TextView(app).apply {
        text = "Your verse is waiting"
        textSize = 26f
        typeface = Typeface.SERIF
        gravity = Gravity.CENTER
        setTextColor(Color.parseColor("#F3EDE2"))
      })
      addView(TextView(app).apply {
        text = "Continue"
        textSize = 16f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setTextColor(Color.parseColor("#0E0D0B"))
        background = GradientDrawable().apply { cornerRadius = 28 * dp; setColor(Color.parseColor("#C9A45C")) }
        setPadding((40 * dp).toInt(), (16 * dp).toInt(), (40 * dp).toInt(), (16 * dp).toInt())
        setOnClickListener { Gate.open(app) }
      }, LinearLayout.LayoutParams(-2, -2).apply { topMargin = (32 * dp).toInt() })
    }
    app.getSystemService(WindowManager::class.java).addView(
      root,
      WindowManager.LayoutParams(-1, -1, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, 0, PixelFormat.OPAQUE)
    )
    view = root
    watchForCalls(app)
  }

  /** The overlay sits above the in-call screen, so get out of the way the moment a call or alarm starts. */
  private fun watchForCalls(app: Context) {
    main.postDelayed({
      if (view == null) return@postDelayed
      if (Gate.busy(app)) hide() else watchForCalls(app)
    }, 1000)
  }

  fun hide() {
    main.removeCallbacksAndMessages(null)
    view?.let { it.context.getSystemService(WindowManager::class.java).removeView(it) }
    view = null
  }
}
