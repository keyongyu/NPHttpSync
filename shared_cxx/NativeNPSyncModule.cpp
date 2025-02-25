#include "NativeNPSyncModule.h"
#include "HttpComm/Comm2.h"
#include <fbjni/fbjni.h>
#include <chrono>
#include <thread>
//#ifdef __ANDROID__
//#include <android/log.h>
//#define LOGX(...) __android_log_print(ANDROID_LOG_WARN,"KY", __VA_ARGS__)
//#endif
//#include <JCallback.h>
#include <glog/logging.h>
#include <react/jni/JCallback.h>
#include "FileSystem.h"
#include <sys/stat.h>
//#include <si/jsi.h>
using namespace std;
extern int g_nLogLevel;
namespace facebook::react {
    auto createJavaCallback(
            jsi::Runtime& rt,
            jsi::Function&& function,
            std::shared_ptr<CallInvoker> jsInvoker) {
        AsyncCallback<> callback {rt, std::move(function), std::move(jsInvoker)};
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
    auto createJavaCallback(
            jsi::Runtime& rt,
            jsi::Function&& function,
            std::shared_ptr<CallInvoker> jsInvoker, jsi::ArrayBuffer&& arrayBuffer ) {
        AsyncCallback<> jcallback {rt, std::move(function), std::move(jsInvoker)};
        std::shared_ptr<jsi::ArrayBuffer> ptr=std::make_shared<jsi::ArrayBuffer>(std::move(arrayBuffer));
        auto follyCall=[jcallback = std::move(jcallback), ptr](folly::dynamic args) mutable {
            jcallback.call([args = std::move(args)](
                    jsi::Runtime& rt, jsi::Function& jsFunction) {
                std::vector<jsi::Value> jsArgs;
                jsArgs.reserve(args.size());
                for (const auto& val : args) {
                    jsArgs.emplace_back(jsi::valueFromDynamic(rt, val));
                }
                jsFunction.call(rt, (const jsi::Value*)jsArgs.data(), jsArgs.size());
            });
        };
        return JCxxCallbackImpl::newObjectCxxArgs(follyCall);
    }
    class JNativeHelper : public facebook::jni::JavaClass<JNativeHelper> {
    public:
        static constexpr auto kJavaDescriptor =
                "Lcom/npsync/NativeHelper;";

        //static void registerNatives();

        //static void setLogPerfMarkerIfNeeded();
        static std::string returnString(){
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
             arg.l=createJavaCallback(rt,std::move(f), std::move(jsInvoker)).release();
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
            return JNativeHelper::returnString();
        }
        return {input.rbegin(), input.rend()};
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

    void internalSendHttpReq(jvalue jcb,jobject argArray, jobject blob, int content_len ){
        static auto cls = JNativeHelper::javaClassStatic();
        static auto meth =
                cls->getStaticMethod<void()>("SendHttpRequest",
                                             "(Lcom/facebook/react/bridge/Callback;[Ljava/lang/String;Ljava/nio/ByteBuffer;I)V");
        jmethodID jmeth =meth.getId();
        JNIEnv* env = jni::Environment::current();
        env->CallStaticVoidMethod(cls.get(), jmeth, jcb, argArray,  blob, content_len);
    }

    void NativeNPSyncModule::SendHttpRequestBlob(jsi::Runtime &rt, jsi::Function f, std::string reqId,
                                             std::string method, std::string url, std::string header,
                                             jsi::Object content, std::string fileToBeSaved, std::optional<double> nTimeoutMs)
    {
        auto arrayBuffer   =  content.getArrayBuffer(rt);

        jobject blob;
        JNIEnv* env = jni::Environment::current();

        //need to hold arrayBuffer in js env while sending it out server
        //so, make this arraybuffer alive when the callback is alive

        int n = arrayBuffer.size(rt);
        blob = (jobject) env->NewDirectByteBuffer(arrayBuffer.data(rt), n);
        jvalue jcb;
        jcb.l = createJavaCallback(rt,std::move(f), jsInvoker_, std::move(arrayBuffer)).release();

        int argc= 7;
        auto argArray= jni::JArrayClass<jni::JString>::newArray(argc);
        double timeout = nTimeoutMs.value_or(-1);
        argArray->setElement(0, *jni::make_jstring(reqId));
        argArray->setElement(1, *jni::make_jstring(method));
        argArray->setElement(2, *jni::make_jstring(url));
        argArray->setElement(3, *jni::make_jstring(header));
        argArray->setElement(4, *jni::make_jstring(""));
        argArray->setElement(5, *jni::make_jstring(fileToBeSaved));
        argArray->setElement(6, * jni::make_jstring(std::to_string(timeout)));
        internalSendHttpReq(jcb, argArray.get(), blob, n);
        env->DeleteLocalRef(blob);
    }

    void NativeNPSyncModule::SendHttpRequestStr(jsi::Runtime &rt, jsi::Function f, const std::string& reqId,
                                 const std::string& method, const std::string& url, const std::string& header,
                                 const std::string&  content, const std::string& fileToBeSaved,
                                 std::optional<double> nTimeoutMs)
    {

        jvalue jcb;
        jcb.l=createJavaCallback(rt,std::move(f), jsInvoker_).release();

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
        internalSendHttpReq(jcb, argArray.get(), nullptr, 0);

    }

    jsi::Object NativeNPSyncModule::__Comm2GetTxnHangingFiles(jsi::Runtime &rt, std::string  strTxnName,
                                                 std::string  strTxnSchema)
    {
        vector<HttpComm::UploadFile> files;
        string err_desc;
        jsi::Object ret{rt};
        if (!HttpComm::Comm2_GetTxnHangingFiles(strTxnName, strTxnSchema, files, err_desc))
        {
            ret.setProperty(rt, "hasError", true);
            ret.setProperty(rt, "errorMsg", std::move(err_desc));
            return ret;
        }

        jsi::Array arrayFiles{rt,files.size()};
        for (int i = 0; i < files.size(); i++) {
            jsi::Object fileItem{rt};
            fileItem.setProperty(rt, "fileName", files[i].fileName);
            fileItem.setProperty(rt, "columnName", files[i].columnName);
            fileItem.setProperty(rt, "commsStatus", files[i].commsStatus);
            fileItem.setProperty(rt, "table", files[i].table);
            fileItem.setProperty(rt, "rowid",(int) (files[i].rowid & 0Xffffffff));
            fileItem.setProperty(rt, "rowidHi",(int)((files[i].rowid & 0Xffffffff00000000) >> 32));
            arrayFiles.setValueAtIndex(rt, i, std::move(fileItem));
        }
        ret.setProperty(rt, "arrayFiles", std::move(arrayFiles));
        return ret;
    }

    struct MyMutableBuffer:jsi::MutableBuffer {
        int m_nLen;
        void * m_pBuffer;
        std::function<void(void*)> m_Deletor;

        MyMutableBuffer() = delete;
        MyMutableBuffer(const MyMutableBuffer&)  = delete;
        MyMutableBuffer(MyMutableBuffer&&)  = delete;
        MyMutableBuffer& operator=(const MyMutableBuffer&) = delete;

        MyMutableBuffer(std::shared_ptr<HttpComm::Buffer> sptr){
            m_pBuffer= sptr->m_pBuf;
            m_nLen = sptr->m_nLen;
            m_Deletor = [sptr2=sptr](void* p){

                void* pData = sptr2->m_pBuf;
                assert(p==pData);
                if(p!=pData) {
                    //int n = sptr2.use_count();
                    //n++;
                    //sptr2.reset();
                }
                //buf.reset((HttpComm::Buffer*)nullptr);
            };
        }
        MyMutableBuffer(std::vector<uint64_t>* pVec){
            m_pBuffer= pVec->data();
            m_nLen = pVec->size()*sizeof(uint64_t);
            m_Deletor = [pVec](void* p){
                void* pData = pVec->data();
                assert(p==pData);
                if(pVec)
                    delete pVec;
            };
        }
        ~MyMutableBuffer(){
           Free();
        }
        void Free(){
            if(m_pBuffer)
                m_Deletor(m_pBuffer);
            m_pBuffer= nullptr;
            m_nLen = 0;
        }
        virtual size_t size() const{
            return m_nLen;
        }
        virtual uint8_t* data(){
            return (uint8_t*)m_pBuffer;
        }
    };
    class BufferHostObject : public jsi::HostObject {
    public:
        std::shared_ptr<HttpComm::Buffer> mHttpCommBuffer;
        BufferHostObject(std::shared_ptr<HttpComm::Buffer> buffer):mHttpCommBuffer(buffer){

        }
//        jsi::Value get(jsi::Runtime&, const jsi::PropNameID& sym) override {
//            return 9000;
//        }
//
//        void set(Runtime&, const PropNameID&, const Value&) override {}
    };
    jsi::Object NativeNPSyncModule::__Comm2MakeTxn(jsi::Runtime &rt, std::string strCompany,
               std::string strAppId, std::string strRefreshToken,
               double ulMaxSize, std::string strTxnName, std::string strTxnSchema)
    {
        jsi::Object ret{rt};
        HttpComm::Comm2Txn txn;

        std::vector<HttpComm::UploadFile> files;
        string err_desc;
        if (!HttpComm::Comm2_MakeTxn(strCompany, strAppId, strRefreshToken, ulMaxSize, strTxnName, strTxnSchema, txn,  err_desc) || ! txn.m_pBuf)
        {
            if (err_desc.length()) {
                ret.setProperty(rt, "hasError", true);
                ret.setProperty(rt, "errorMsg", err_desc.c_str());
            }
           return ret;
        }

        //printf("JS_Comm2MakeTxn  Buffer:%p m_pBuf:%p\n",txn.m_pBuf,txn.m_pBuf->m_pBuf);
        auto buf = std::shared_ptr<HttpComm::Buffer>(txn.m_pBuf);
        txn.m_pBuf = NULL;
        ret.setProperty(rt, "hasNext",txn.m_HasNext);
        jsi::ArrayBuffer arrayBuffer{rt, std::make_shared<MyMutableBuffer >(buf)};
        auto ho = jsi::Object::createFromHostObject(rt, std::make_shared<BufferHostObject>(buf));
        ret.setProperty(rt, "byteArray", arrayBuffer);
        ret.setProperty(rt, "bufferHo",ho);
        ret.setProperty(rt, "msgID",  txn.m_MsgID);
        jsi::ArrayBuffer arrayRowId{rt, std::make_shared<MyMutableBuffer>(txn.m_pRowIDs)};
        txn.m_pRowIDs = NULL;
        ret.setProperty(rt,"rowIDs", arrayRowId);
        return ret;
    }
    void NativeNPSyncModule::__Comm2CommitTxn(jsi::Runtime &rt, std::string txnName,
                              std::string tblName, jsi::Object txnBlk, std::string  statusFlag)
    {
        auto value  = txnBlk.getProperty(rt, "bufferHo");
        if(value.isObject() ){
            auto obj= value.asObject(rt);
            if(obj.isHostObject(rt) ) {
                auto ho= obj.getHostObject<BufferHostObject>(rt);
                ho->mHttpCommBuffer->Free();
                txnBlk.setProperty(rt,"bufferHo", 0);
            }
        }

        value  = txnBlk.getProperty(rt, "rowIDs");
        if(value.isObject() ){
            auto obj= value.asObject(rt);
            if(obj.isArrayBuffer(rt) ) {
                auto rowidArray= obj.getArrayBuffer(rt);
                uint8_t* data = rowidArray.data(rt);
                int byteLength = rowidArray.length(rt);
                uint64_t * rowids = (uint64_t*) data;
                HttpComm::Comm2_CommitTxn(txnName,tblName,rowids,
                     byteLength/sizeof(uint64_t), statusFlag);
            }
        }
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

    bool CopyFile(FILE* fpSrc,FILE* fpDst)
    {
        bool bRet = true;
        int  iBufSize = 0x8000;
        char* pBuf = new char[iBufSize];
        while (!feof(fpSrc)) {
            size_t iRead = fread(pBuf, 1, iBufSize, fpSrc);
            if (iRead > 0) {
                if (iRead != fwrite(pBuf, 1, iRead, fpDst)) {
                    bRet = false;
                    break;
                }
            }
            else
                break;
        }
        delete[] pBuf;

        return bRet;
    }

    static FILE* OpenFile(const std::string& dstFile, const char* mode)
    {
        FILE * hFile= fopen(dstFile.c_str(), mode) ;
        if (!hFile) {
            auto pos = dstFile.rfind('/');
            if (pos == std::string::npos)
                return NULL;
            auto dir = dstFile.substr(0, pos);
            FileSystem::MakeDir(dir.c_str());
            hFile = fopen(dstFile.c_str(), "ab");
        }
        return hFile;
    }

    bool NativeNPSyncModule::AppendFile(jsi::Runtime &rt, std::string dstFile, std::string srcFile)
    {
        if(dstFile.empty() ||srcFile.empty() )
            return false;
        FILE * hSrcFile= OpenFile(srcFile,"rb");
        FILE * hDstFile= OpenFile(dstFile,"ab");
        bool ret = false;
        if(hSrcFile&&hDstFile)
            ret = CopyFile(hDstFile, hSrcFile);
        if(hSrcFile)
            fclose(hSrcFile);
        if(hDstFile)
            fclose(hDstFile);
        return ret;
    }

    bool NativeNPSyncModule::WriteFile(jsi::Runtime &rt, std::string fileName,
                                       std::string content, std::string mode) {
        if(fileName.empty())
            return false;
        FILE * hFile= OpenFile(fileName,mode.c_str());
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
        if(access(srcFileName.c_str(), F_OK ) == -1 ){
            return true;
        }
        auto ret  = 0==rename(srcFileName.c_str(), dstFileName.c_str());
        if(!ret) {

            auto pos = dstFileName.rfind('/');
            if (pos == std::string::npos) {
                LOG_MSG(LOG_ERROR_LVL, "fail to move file %s to %s", srcFileName.c_str(),
                        dstFileName.c_str());
                return false;
            }
            auto dstFolder = dstFileName.substr(0, pos);
            if (access(dstFolder.c_str(), F_OK) == -1 && ENOENT == errno) //folder doesn't exist
                FileSystem::MakeDir(dstFolder);

            ret = 0==rename(srcFileName.c_str(), dstFileName.c_str());
            if(ret)
                LOG_MSG(LOG_ERROR_LVL, "fail to move file %s to %s", srcFileName.c_str(),
                    dstFileName.c_str());
        }
        return ret;
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

    std::string NativeNPSyncModule::workDir_ ;
    void NativeNPSyncModule::SetWorkDir(jsi::Runtime &rt, std::string folder){
        workDir_ = folder;
    }

    sqlite3* NativeNPSyncModule::db_;
    void NativeNPSyncModule::SetWorkingSqliteConnection(sqlite3* db){
        db_= db;
        //LOGX(">>>> set sqlite connection %p", db_);
    }

    std::string NativeNPSyncModule::Comm2ProcessTblSync(jsi::Runtime &rt, std::string fileName, bool dryRun)
    {
        return HttpComm::Comm2_ProcessTblSync(fileName, dryRun);
    }

    void NativeNPSyncModule::SQLBeginTransaction(jsi::Runtime &rt)
    {
        char *error=nullptr;
        if(GetSqlite3DB()) {
            if(SQLITE_OK == sqlite3_exec(GetSqlite3DB(), "BEGIN", 0, 0, &error))
                return;
            LOG_MSG(LOG_ERROR_LVL, "cannot start transcation, error: %s", error?error:"no error");
        }else
            LOG_MSG(LOG_ERROR_LVL, "sql connection is NOT ready");
    }
    void NativeNPSyncModule::SQLCommit(jsi::Runtime &rt, bool commit)
    {

        char *error=nullptr;
        const char * sql = (commit) ? "COMMIT TRANSACTION" : "ROLLBACK TRANSACTION";
        if(GetSqlite3DB()) {
            if(SQLITE_OK == sqlite3_exec(GetSqlite3DB(), sql, 0, 0, &error))
                return;
            LOG_MSG(LOG_ERROR_LVL, "cannot %s, error: %s",sql,  error?error:"no error");
        }else
            LOG_MSG(LOG_ERROR_LVL, "sql connection is NOT ready");
    }











    std::shared_ptr<R3_Log>  NativeNPLoggerModule::logger_;
    void NativeNPLoggerModule::WriteLog(jsi::Runtime &rt, int lvl, std::string text){
        if(logger_)
            logger_->LogFullMessage(lvl, text.c_str(), text.length());
    }
    void NativeNPLoggerModule::Recreate(jsi::Runtime &rt, std::string logFileName,  int lvl, int maxSize){
       logger_.reset();
       auto idx = logFileName.rfind('/');
       std::string path = logFileName.substr(0, idx);
       std::string name= logFileName.substr(idx+1);
       if(lvl!=0)
           g_nLogLevel = lvl;
       if (access(path.c_str(), F_OK) == -1 && ENOENT == errno) //folder doesn't exist
           FileSystem::MakeDir(path);

        logger_=std::make_shared<R3_Log>(path.c_str(),name.c_str(),maxSize);
    }
    void NativeNPLoggerModule::Close(jsi::Runtime &rt){
        logger_.reset();
    }

} // namespace facebook::react
