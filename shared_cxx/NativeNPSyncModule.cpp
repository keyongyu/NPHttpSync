#include "NativeNPSyncModule.h"
#include <fbjni/fbjni.h>
#include <chrono>
#include <thread>

#ifdef __ANDROID__
#include <android/log.h>
#endif
//
//#ifdef __ANDROID__
//#define VANILLAJNI_LOG_ERROR(tag, format, ...) \
//  __android_log_print(ANDROID_LOG_ERROR, tag, format, ##__VA_ARGS__)
//#else
//#define VANILLAJNI_LOG_ERROR(tag, format, ...)
//#endif
//
//#define VANILLAJNI_DIE() std::abort()
//
//namespace jni{
//    void logErrorMessageAndDie(const char* message);
//    JavaVM* globalVm = nullptr;
//    struct JavaVMInitializer {
//        explicit JavaVMInitializer(JavaVM* vm) {
//            if (!vm) {
//                logErrorMessageAndDie(
//                        "You cannot pass a NULL JavaVM to ensureInitialized");
//            }
//            globalVm = vm;
//        }
//    };
//
//    jint ensureInitialized(JNIEnv** env, JavaVM* vm) {
//        static JavaVMInitializer init(vm);
//
//        if (env == nullptr) {
//            logErrorMessageAndDie(
//                    "Need to pass a valid JNIEnv pointer to vanillajni initialization "
//                    "routine");
//        }
//
//        if (vm->GetEnv(reinterpret_cast<void**>(env), JNI_VERSION_1_6) != JNI_OK) {
//            logErrorMessageAndDie(
//                    "Error retrieving JNIEnv during initialization of vanillajni");
//        }
//
//        return JNI_VERSION_1_6;
//    }
//
//    JNIEnv* getCurrentEnv() {
//        JNIEnv* env = nullptr;
//        jint ret = globalVm->GetEnv((void**)&env, JNI_VERSION_1_6);
//        if (ret != JNI_OK) {
//            logErrorMessageAndDie(
//                    "There was an error retrieving the current JNIEnv. Make sure the "
//                    "current thread is attached");
//        }
//        return env;
//    }
//
//    void logErrorMessageAndDie(const char* message) {
//        (void)message;
//        VANILLAJNI_LOG_ERROR(
//                "VanillaJni",
//                "Aborting due to error detected in native code: %s",
//                message);
//        VANILLAJNI_DIE();
//    }
//}
//

namespace facebook::react {
    class JMainActivity : public facebook::jni::JavaClass<JMainActivity> {
    public:
        static constexpr auto kJavaDescriptor =
                "Lcom/npsync/NativeHelper;";

        //static void registerNatives();

        //static void setLogPerfMarkerIfNeeded();
        static std::string ttt(){
            static auto cls = javaClassStatic();
            static auto meth =
                    cls->getStaticMethod<jstring ()>("returnString");
            return meth(cls)->toStdString();
        }
    };


    NativeNPSyncModule::NativeNPSyncModule(std::shared_ptr<CallInvoker> jsInvoker)
        : NativeNPSyncCxxSpec(std::move(jsInvoker)) {}

    std::string NativeNPSyncModule::reverseString(jsi::Runtime& rt, std::string input) {
        JNIEnv* env = jni::Environment::current();
        if(env){
            return JMainActivity::ttt();
        }
        return std::string(input.rbegin(), input.rend());
    }

    void NativeNPSyncModule::echoFromCpp(jsi::Runtime &rt, std::string id, AsyncCallback<std::string> callback) {
        std::thread t([callback = std::move(callback)]() {
            int counter = 0;
            while (counter<100)
            {
                /* code */
                callback.call("echoFromCpp " + std::to_string(counter++));
                std::this_thread::sleep_for(std::chrono::milliseconds(50));
            }

        });
        t.detach();

    }

    AsyncPromise<std::string> NativeNPSyncModule::callPromise(jsi::Runtime &rt, std::string id){
        auto promise = std::make_shared<facebook::react::AsyncPromise<std::string>>(rt, jsInvoker_);
        std::thread t([promise, id]() {
            promise->resolve("from promise:" + id) ;
        });
        t.detach();
        return *promise;
    }



} // namespace facebook::react
