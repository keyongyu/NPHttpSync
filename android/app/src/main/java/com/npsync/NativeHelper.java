package com.npsync;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;

import com.facebook.react.bridge.Callback;

import java.lang.ref.WeakReference;
import java.nio.ByteBuffer;

public class NativeHelper {
    static WeakReference<MainActivity> mainActivityWeakReference;
    static String returnString(){

        if(mainActivityWeakReference.get()!=null)
            return "from java NativeHelper:" + mainActivityWeakReference.get().getMainComponentName();
        else
            return "from java NativeHelper: no activity" ;

    }
    static MainActivity getAppMain() {
        return mainActivityWeakReference.get();
    }

    static void callbackTest(final Callback cb){
        MainActivity act= mainActivityWeakReference.get();
        if(act ==null )
            return ;

        act.runOnUiThread(()->{

            cb.invoke("callbackTest");
            cb.invoke("callbackTest1");
            cb.invoke("callbackTest3");
            cb.invoke("callbackTest2");
        });
    }

    static void SendHttpRequest(final Callback cb,  String[] argv,
                                final ByteBuffer blob, final int blob_length) {
            URLSessionManager.getInstance().Execute(cb, argv,blob, blob_length);
    }
}
