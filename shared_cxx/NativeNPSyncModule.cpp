#include "NativeNPSyncModule.h"
#include <fbjni/fbjni.h>
#include <chrono>
#include <thread>
#ifdef __ANDROID__
#include <android/log.h>
#endif
//#include <JCallback.h>
#include <glog/logging.h>
#include <react/jni/JCallback.h>
#include "FileSystem.h"
#include <sys/stat.h>
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
    auto createJavaCallback(
            jsi::Runtime& rt,
            jsi::Function&& function,
            std::shared_ptr<CallInvoker> jsInvoker) {
        AsyncCallback<> callback(
                {rt, std::move(function), std::move(jsInvoker)});
        return JCxxCallbackImpl::newObjectCxxArgs(
                [callback = std::move(callback)](folly::dynamic args) mutable {
                    callback.call([args = std::move(args)](
                            jsi::Runtime& rt, jsi::Function& jsFunction) {
                        std::vector<jsi::Value> jsArgs;
                        jsArgs.reserve(args.size());
                        for (const auto& val : args) {
                            jsArgs.emplace_back(jsi::valueFromDynamic(rt, val));
                        }
                        jsFunction.call(rt, (const jsi::Value*)jsArgs.data(), jsArgs.size());
                    });
                });
    }
    class JNativeHelper : public facebook::jni::JavaClass<JNativeHelper> {
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
        static void  jniCallback(jsi::Runtime &rt, jsi::Function&& f, std::shared_ptr<CallInvoker> jsInvoker){
            static auto cls = javaClassStatic();
            static auto meth =
                    cls->getStaticMethod<void()>("callbackTest", "(Lcom/facebook/react/bridge/Callback;)V");
             jobject jobj = cls.get();
             jmethodID jmeth =meth.getId();
             JNIEnv* env = jni::Environment::current();
             jvalue arg;
             arg.l=createJavaCallback(rt,std::move(f), jsInvoker).release();
             env->CallStaticVoidMethod((jclass)jobj, jmeth, arg);
//            static jmethodID cachedMethodId = nullptr;
//            if (cachedMethodId == nullptr) {
//                JNIEnv* env = jni::Environment::current();
//                //jclass cls = env->FindClass(kJavaDescriptor);
//                //cachedMethodId =  env->GetStaticMethodID( cls->self(), "callbackTest", "(Lcom/facebook/react/bridge/CxxCallbackImpl;)V");
//            }
            //static auto meth =
            //        cls->getStaticMethod<jstring (std::string)>("sendTextFromUIThread");
            //return meth(cls)->toStdString();
            //jsi::Function f = std::move( Bridging<std::string()>::toJs(callback) )
            //AsyncCallback<> callback(move(callback.callback_->function_.getFunction(rt);cSallback.);
                    //{rt, std::move(function), std::move(jsInvoker)});
            //auto javacb = createJavaCallback(std::move(callback2));
        }

    };
//    static jsi::Value __hostFunction_NativeNPSyncCxxSpecJSI_SendHttpRequest_np(jsi::Runtime &rt, TurboModule &turboModule, const jsi::Value* args, size_t count) {
//
////        static_cast<NativeNPSyncCxxSpecJSI *>(&turboModule)->SendHttpRequest(
////                rt,
////                count <= 0 ? throw jsi::JSError(rt, "Expected argument in position 0 to be passed") : args[0].asObject(rt).asFunction(rt),
////                count <= 1 ? throw jsi::JSError(rt, "Expected argument in position 1 to be passed") : args[1].asString(rt),
////                count <= 2 ? throw jsi::JSError(rt, "Expected argument in position 2 to be passed") : args[2].asString(rt),
////                count <= 3 ? throw jsi::JSError(rt, "Expected argument in position 3 to be passed") : args[3].asString(rt),
////                count <= 4 ? throw jsi::JSError(rt, "Expected argument in position 4 to be passed") : args[4].asString(rt),
////                count <= 5 ? throw jsi::JSError(rt, "Expected argument in position 5 to be passed") : args[5],
////                count <= 6 ? throw jsi::JSError(rt, "Expected argument in position 6 to be passed") : args[6].asObject(rt),
////                count <= 7 || args[7].isUndefined() ? std::nullopt : std::make_optional(args[7].asNumber())
////        );
//        return jsi::Value::undefined();
//    }

    NativeNPSyncModule::NativeNPSyncModule(std::shared_ptr<CallInvoker> jsInvoker)
        : NativeNPSyncCxxSpec(std::move(jsInvoker)) {
        //auto * ptr = (NativeNPSyncCxxSpec<NativeNPSyncModule>*) this;

        //size_t offset = ((size_t) (&(((NativeNPSyncModule *) 0)->delegate_)));

    }

    std::string NativeNPSyncModule::reverseString(jsi::Runtime& rt, std::string input) {
        JNIEnv* env = jni::Environment::current();
        if(env){
            return JNativeHelper::ttt();
        }
        return std::string(input.rbegin(), input.rend());
    }

    void NativeNPSyncModule::echoFromCpp(jsi::Runtime &rt, std::string id, jsi::Function f) {
        JNativeHelper::jniCallback(rt,std::move(f),jsInvoker_);
//        AsyncCallback<std::string> callback(rt, std::move(f), jsInvoker_);
//        std::thread t([callback = std::move(callback)]() {
//            int counter = 0;
//            while (counter<100)
//            {
//                /* code */
//                callback.call("echoFromCpp " + std::to_string(counter++));
//                std::this_thread::sleep_for(std::chrono::milliseconds(50));
//            }
//
//        });
//        t.detach();


    }
    //void NativeNPSyncModule::echoFromCpp(jsi::Runtime &rt, std::string id, AsyncCallback<std::string> callback) {
//        std::thread t([callback = std::move(callback)]() {
//            int counter = 0;
//            while (counter<100)
//            {
//                /* code */
//                callback.call("echoFromCpp " + std::to_string(counter++));
//                std::this_thread::sleep_for(std::chrono::milliseconds(50));
//            }
//
//        });
//        t.detach();

    //}

    AsyncPromise<std::string> NativeNPSyncModule::callPromise(jsi::Runtime &rt, std::string id){
        auto promise = std::make_shared<facebook::react::AsyncPromise<std::string>>(rt, jsInvoker_);
        std::thread t([promise, id]() {
            promise->resolve("from promise:" + id) ;
        });
        t.detach();
        return *promise;
    }
    void NativeNPSyncModule::SendHttpRequestBlob(jsi::Runtime &rt, jsi::Function f, std::string reqId,
                                             std::string method, std::string url, std::string header,
                                             jsi::Object content, std::string fileToBeSaved, std::optional<double> nTimeoutMs) {

    }

    void NativeNPSyncModule::SendHttpRequest(jsi::Runtime &rt, jsi::Function f, std::string reqId,
                                 std::string method, std::string url, std::string header,
                                 std::string content, std::string fileToBeSaved, std::optional<double> nTimeoutMs) {


        static auto cls = JNativeHelper::javaClassStatic();
        static auto meth =
                cls->getStaticMethod<void()>("SendHttpRequest",
                 "(Lcom/facebook/react/bridge/Callback;[Ljava/lang/String;Ljava/nio/ByteBuffer;I)V");
        jmethodID jmeth =meth.getId();
        JNIEnv* env = jni::Environment::current();
        jvalue jcb;
        jcb.l=createJavaCallback(rt,std::move(f), jsInvoker_).release();

//        AsyncCallback<> callback( {rt, std::move(f), jsInvoker_});
//         jcb.l = JCxxCallbackImpl::newObjectCxxArgs(
//                 [callback = std::move(callback)](folly::dynamic args) mutable {
//                     callback.call([args = std::move(args)](
//                             jsi::Runtime& rt, jsi::Function& jsFunction) {
//                         std::vector<jsi::Value> jsArgs;
//                         jsArgs.reserve(args.size());
//                         for (const auto& val : args) {
//                             jsArgs.emplace_back(jsi::valueFromDynamic(rt, val));
//                         }
//                         jsFunction.call(rt, (const jsi::Value*)jsArgs.data(), jsArgs.size());
//                     });
//                 }).release();


        int argc= 7;
        auto argArray= jni::JArrayClass<jni::JString>::newArray(argc);
        double timeout = nTimeoutMs.value_or(-1);
        argArray->setElement(0, *jni::make_jstring(reqId));
        argArray->setElement(1, *jni::make_jstring(method));
        argArray->setElement(2, *jni::make_jstring(url));
        argArray->setElement(3, *jni::make_jstring(header));
        argArray->setElement(4, *jni::make_jstring(content));
        argArray->setElement(5, *jni::make_jstring(fileToBeSaved));
        argArray->setElement(6, * jni::make_jstring(std::to_string(timeout)));

        env->CallStaticVoidMethod(cls.get(), jmeth, jcb, argArray.get(),  nullptr, 0);

    }

    std::string NativeNPSyncModule::LoadFile(jsi::Runtime &rt, std::string fileName, std::optional<int> maxBytes){
        FILE * hFile=NULL ;
        if(!fileName.empty())
            hFile = fopen(fileName.c_str(), "rb") ;

        if (!hFile){
            return "" ;
        }
        fseek(hFile, 0, SEEK_END) ;
        int dwLen = (int)ftell(hFile) ;
        int n=std::min(dwLen,maxBytes.value_or(dwLen));
        std::string content(n,'\0');
        fseek(hFile, 0, SEEK_SET) ;
        if(fread(content.data(), 1, n, hFile) !=n)
            content="";
        fclose(hFile);
        return content;
    }


    bool NativeNPSyncModule::WriteFile(jsi::Runtime &rt, std::string fileName,
                                       std::string content, std::string mode) {
        if(fileName.empty())
            return false;
        FILE * hFile= fopen(fileName.c_str(), mode.c_str()) ;
        if (!hFile) {
            auto pos = fileName.rfind('/');
            if (pos == std::string::npos)
                return false;
            auto dir = fileName.substr(0, pos);
            FileSystem::MakeDir(dir.c_str());

            hFile = fopen(fileName.c_str(), mode.c_str());
        }
        if(!hFile)
            return false;
        bool ret = fwrite(content.data(), 1, content.length(), hFile) !=content.length();
        fclose(hFile);
        return ret;
    }
    bool NativeNPSyncModule::DeleteFile(jsi::Runtime &rt, std::string fileName) {
        if(fileName.empty())
            return false;
        return 0==unlink(fileName.c_str());
    }
    bool NativeNPSyncModule::MoveFile(jsi::Runtime &rt, std::string srcFileName, std::string dstFileName, std::optional<bool> overwrite) {
        if(srcFileName.empty() || dstFileName.empty())
            return false;
        //bool rewrite= overwrite.value_or(true);

        return 0==rename(srcFileName.c_str(), dstFileName.c_str());
    }



   bool NativeNPSyncModule::Exists(jsi::Runtime &rt, std::string fileName) {
       struct stat stFileInfo;
       return stat(fileName.c_str(),&stFileInfo)==0;
    }

    void NativeNPSyncModule::DeleteFileAll(jsi::Runtime &rt, std::string fileName, std::string pattern)
    {
        FileSystem::DeleteFileAll(fileName.c_str(), pattern.c_str());
    }

    void NativeNPSyncModule::DeleteFolder(jsi::Runtime &rt, std::string folder){
        FileSystem::DeleteFolder(std::move(folder));
    }
} // namespace facebook::react
