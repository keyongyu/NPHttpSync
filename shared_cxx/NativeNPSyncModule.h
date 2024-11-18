#pragma once

#include <NPSyncJSI.h>

#include <memory>
#include <string>

namespace facebook::react {

class NativeNPSyncModule: public NativeNPSyncCxxSpec<NativeNPSyncModule> {
public:
  NativeNPSyncModule(std::shared_ptr<CallInvoker> jsInvoker);

  std::string reverseString(jsi::Runtime& rt, std::string input);
  void echoFromCpp(jsi::Runtime& rt, std::string id, jsi::Function f);
  //void echoFromCpp(jsi::Runtime& rt, std::string id, AsyncCallback<std::string> callback);
  //jsi::Value callTest(jsi::Runtime &rt, jsi::String id);
  AsyncPromise<std::string> callPromise(jsi::Runtime &rt, std::string id);
};

} // namespace facebook::react

