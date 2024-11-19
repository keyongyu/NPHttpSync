#pragma once

#include <NPSyncJSI.h>

#include <memory>
#include <string>

namespace facebook::react {

    class NativeNPSyncModule : public NativeNPSyncCxxSpec<NativeNPSyncModule> {
    public:
        NativeNPSyncModule(std::shared_ptr<CallInvoker> jsInvoker);

        std::string reverseString(jsi::Runtime &rt, std::string input);

        void echoFromCpp(jsi::Runtime &rt, std::string id, jsi::Function f);

        //void echoFromCpp(jsi::Runtime& rt, std::string id, AsyncCallback<std::string> callback);
        //jsi::Value callTest(jsi::Runtime &rt, jsi::String id);
        AsyncPromise<std::string> callPromise(jsi::Runtime &rt, std::string id);

        void SendHttpRequest(jsi::Runtime &rt, jsi::Function f, std::string reqId,
                             std::string method, std::string url, std::string header,
                             std::string content, bool bSaveToFile, std::optional<double> nTimeoutMs);
        void SendHttpRequestBlob(jsi::Runtime &rt, jsi::Function f, std::string reqId,
                             std::string method, std::string url, std::string header,
                              jsi::Object content, bool bSaveToFile, std::optional<double> nTimeoutMs);

    };

}// namespace facebook::react

