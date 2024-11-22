package com.npsync
import android.content.res.Configuration
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import expo.modules.kotlin.ExpoModulesHelper
import expo.modules.kotlin.NPModulesProviderProxy
import expo.modules.sqlite.SQLiteModule

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      ReactNativeHostWrapper(this, object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      })

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }

    //the origin expo-sqlite exposes all sqlite resources to js world
    //but we need access the sqlite connection from c code as well,
    //so have to retrieve raw(c) sqlite connection from js world.
    //that is why we have to modify it to allow us to get raw c
    //sqlite connection.

    //I modified ExpoModulesHelper.kt, here is the hacked code

//    package expo.modules.kotlin
//
//    import android.util.Log
//    import expo.modules.kotlin.modules.Module
//
//    class NPModulesProviderProxy: ModulesProvider{
//      private val  moduleList = ArrayList<Class<out Module>>();
//
//      override fun getModulesList(): List<Class<out Module>> {
//        return  moduleList;
//      }
//      fun addModuleList(lst:List<Class<out Module>> ){
//        moduleList.addAll(lst);
//      }
//      fun addModule(module:Class<out Module> ){
//        moduleList.add(module);
//      }
//    }
//    class ExpoModulesHelper {
//      companion object {
//        val modulesProvider by lazy {
//          try {
//            val newProvider = NPModulesProviderProxy();
//            val expoModules = Class.forName("expo.modules.ExpoModulesPackageList")
//            val old = expoModules.getConstructor().newInstance() as ModulesProvider
//            newProvider.addModuleList(old.getModulesList())
//            newProvider
//          } catch (e: Exception) {
//            Log.e("ExpoModulesHelper", "Couldn't get expo modules list.", e)
//            null
//          }
//        }
//      }
//    }


    val provider = ExpoModulesHelper.Companion.modulesProvider as NPModulesProviderProxy;
    provider.addModule(SQLiteModule::class.java);

    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
