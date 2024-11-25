#pragma once

#include <NPSyncJSI.h>
#include "R3_Log.hpp"
#include "../../../../../shared_cxx/NativeNPSyncModule.h"
#include "vendor/sqlite3/sqlite3.h"
#include <memory>
#include <string>
namespace HttpComm{
    class SqliteHelper;
}
namespace facebook::react {

    class NativeNPSyncModule : public NativeNPSyncCxxSpec<NativeNPSyncModule> {
    public:
        NativeNPSyncModule(std::shared_ptr<CallInvoker> jsInvoker);

        std::string reverseString(jsi::Runtime &rt, std::string input);

        void echoFromCpp(jsi::Runtime &rt, std::string id, jsi::Function f);

        //void echoFromCpp(jsi::Runtime& rt, std::string id, AsyncCallback<std::string> callback);
        //jsi::Value callTest(jsi::Runtime &rt, jsi::String id);
        AsyncPromise<std::string> callPromise(jsi::Runtime &rt, std::string id);

        void SendHttpRequest(jsi::Runtime &rt, jsi::Function f, const std::string& reqId,
                             const std::string& method, const std::string& url, const std::string& header,
                             const std::string& content, const std::string& fileToBeSaved, std::optional<double> nTimeoutMs);
        void SendHttpRequestBlob(jsi::Runtime &rt, jsi::Function f, std::string reqId,
                             std::string method, std::string url, std::string header,
                              jsi::Object content, std::string fileToBeSaved, std::optional<double> nTimeoutMs);
        std::string LoadFile(jsi::Runtime &rt, std::string fileName, std::optional<int> maxBytemaxBytes) ;
        bool WriteFile(jsi::Runtime &rt, std::string fileName, std::string content, std::string mode) ;
        bool DeleteFile(jsi::Runtime &rt, std::string fileName) ;
        bool MoveFile(jsi::Runtime &rt, std::string srcFileName, std::string dstFileName, std::optional<bool> overwrite) ;

        void DeleteFileAll(jsi::Runtime &rt, std::string fileName, std::string patten) ;
        bool Exists(jsi::Runtime &rt, std::string fileName) ;
        void DeleteFolder(jsi::Runtime &rt, std::string folder) ;
        void SetWorkDir(jsi::Runtime &rt, std::string folder);

        //void TestSqliteDB(jsi::Runtime &rt, jsi::Object);
        std::string Comm2ProcessTblSync(jsi::Runtime &rt, std::string fileName, bool dryRun);
        void SQLBeginTransaction(jsi::Runtime &rt) ;
        void SQLCommit(jsi::Runtime &rt, bool commit) ;
    private:
        static sqlite3 * db_;
    public:
        static std::string workDir_;
        static void SetWorkingSqliteConnection(sqlite3* db);
        static sqlite3* GetSqlite3DB(){ return db_;}
    };
    class NativeNPLoggerModule: public NativeNPLoggerCxxSpec<NativeNPLoggerModule> {

    public:
        static std::shared_ptr<R3_Log>    logger_;
    public:
        NativeNPLoggerModule(std::shared_ptr<CallInvoker> jsInvoker)
            : NativeNPLoggerCxxSpec<NativeNPLoggerModule>(jsInvoker){}
        ~NativeNPLoggerModule(){ logger_.reset();}
        void WriteLog(jsi::Runtime &rt, int lvl,  std::string text) ;
        void Recreate(jsi::Runtime &rt, std::string logFileName,  int lvl, int maxSize) ;
        void Close(jsi::Runtime &rt);
    };
}// namespace facebook::react

