package com.npsync;

import java.lang.ref.WeakReference;

public class NativeHelper {
    static WeakReference<MainActivity> mainActivityWeakReference;
    static String returnString(){

        if(mainActivityWeakReference.get()!=null)
            return "from java NativeHelper:" + mainActivityWeakReference.get().getMainComponentName();
        else
            return "from java NativeHelper: no activity" ;

    }
}
