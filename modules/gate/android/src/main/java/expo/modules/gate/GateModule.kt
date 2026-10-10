package expo.modules.gate

import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class GateModule : Module() {
  private val ctx get() = requireNotNull(appContext.reactContext)

  private fun openSettings(action: String) =
    ctx.startActivity(Intent(action, Uri.parse("package:${ctx.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))

  override fun definition() = ModuleDefinition {
    Name("Gate")

    // Opening the app restarts the service if the user turned the lock on but Android stopped it.
    OnCreate { if (Gate.enabled(ctx)) GateService.start(ctx) }

    // bible-web.txt is one verse per line, "Genesis 1:1|text". Returns [ref, text], or null past the end.
    // ponytail: linear scan of the asset per call, add a line-offset index if late books feel slow
    AsyncFunction("verse") { index: Int ->
      ctx.assets.open("bible-web.txt").bufferedReader().useLines { lines ->
        lines.drop(index).firstOrNull()?.split('|', limit = 2)
      }
    }

    Function("status") {
      mapOf(
        "enabled" to Gate.enabled(ctx),
        "overlay" to Settings.canDrawOverlays(ctx),
        "battery" to ctx.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(ctx.packageName),
      )
    }

    Function("setEnabled") { on: Boolean -> Gate.setEnabled(ctx, on) }
    Function("openOverlaySettings") { openSettings(Settings.ACTION_MANAGE_OVERLAY_PERMISSION) }
    Function("openAppSettings") { openSettings(Settings.ACTION_APPLICATION_DETAILS_SETTINGS) }
    Function("open") { Gate.open(ctx) }

    AsyncFunction("unlock") { dialer: Boolean ->
      (appContext.currentActivity as? GateActivity)?.unlock(dialer) ?: Gate.startCooldown(ctx)
    }.runOnQueue(Queues.MAIN)
  }
}
