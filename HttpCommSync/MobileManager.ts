import {
  ChangeCommPrompt, CommAlert,
  DataInToken,
  FCStorage, FirstCheckDir, GetHardwareId,
  IsDevEngine,
  Logger,
  make_progress_reporter,
  NetProgressReportFunc,
  ProgressReportFunc,
  ReportArg, toJson, WaitForPromiseT,
} from './Common';
import {gHttpAsync, isTimeoutResponse, NoNetwork, ConnectionError} from "./HttpAsync"
import {gAuth} from "./OAuth"
// import {gHttpDataSync} from "./HttpDataSync"
import NativeNPSync, {IHttpResponse} from '../specs/NativeNPSync.ts';
import {gStorageConfig} from './Storage.ts';
import {gS3} from './S3DownloadUpload.ts';
const IDS_CANCEL                                =  2501
const IDS_HTTPCOMM_PROMPT_URL                   =  2700
const IDS_HTTPCOMM_PROMPT_USER                  =  2701
const IDS_HTTPCOMM_PROMPT_PASSWD                =  2702
const IDS_HTTPCOMM_SETUP_URL                    =  2703
const IDS_HTTPCOMM_SETUP_USER                   =  2704
const IDS_HTTPCOMM_SETUP_PASSWD                 =  2705
const IDS_HTTPCOMM_SETUP_LOGIN                  =  2706
const IDS_HTTPCOMM_FAIL_TO_SUBMIT_TXN_IN_7DAYS  =  2707
const IDS_HTTPCOMM_FAIL_TO_LOGIN                =  2708
const IDS_HTTPCOMM_SYSTEM_ERROR                 =  2709
const IDS_HTTPCOMM_NO_NETWORK                   =  2710
const IDS_HTTPCOMM_AUTH_DIALOG_TITLE            =  2711
const IDS_HTTPCOMM_AUTHENTICATION               =  2712
const IDS_HTTPCOMM_DEFAULT_BUTTON               =  2713
const IDS_HTTPCOMM_NO_RESPONSE                  =  2714
const IDS_HTTPCOMM_BAD_QRCODE                   =  2715
const IDS_HTTPCOMM_BAD_SERVER_URL               =  2716
const IDS_HTTPCOMM_FIRSTCHECK                   =  2717
const IDS_HTTPCOMM_CHANGE_PASSWORD              =  2718
const IDS_HTTPCOMM_FORGET_PASSWORD              =  2719
const IDS_HTTPCOMM_CHANGE_PASSWORD_NEW          =  2720
const IDS_HTTPCOMM_NEW_PASSWORD_MISMATCH        =  2721
const IDS_HTTPCOMM_NEW_PASSWORD_CANNOT_BE_EMPTY =  2722
const IDS_HTTPCOMM_PASSWORD_EXPIRED             =  2723
const IDS_HTTPCOMM_TOKEN_EXPIRED                =  2724
const IDS_HTTPCOMM_FORGET_PASSWORD_SENT         =  2725
const IDS_HTTPCOMM_FAIL_TO_FORGET_PASSWORD      =  2726
const IDS_HTTPCOMM_DIFFERENT_USER               =  2727

//const IDS_MM_RESTART_APP                        = 4024
const IDS_MM_DIALOG_TITLE                       = 4025
const IDS_MM_DEVICE_WIPEOUT                     = 4026
const IDS_MM_DOWNLOADING_INSTRUCTIONS           = 4027
const IDS_MM_PROCESSING_INSTRUCTIONS            = 4028
const IDS_MM_DOWNLOADING_COMMS_SETTINGS         = 4029
const IDS_MM_DOWNLOADING_DEVICE_SETTINGS        = 4030
const IDS_MM_DOWNLOADING_ENGINE_SETTINGS        = 4031
const IDS_MM_DOWNLOADING_APP_SETTINGS           = 4032
const IDS_MM_DOWNLOADING_APPLICATION            = 4033
const IDS_MM_DOWNLOADING_NEW_ENG_IOS            = 4034
const IDS_MM_DOWNLOADING_NEW_ENG_AND            = 4035
const IDS_MM_USER_VALIDATION_FAIL               = 4036
const IDS_MM_ENGINE_RESTART                     = 4037
const IDS_MM_SAFETYNET_EXCEPTION                = 4038

const IDS_PRN_SETUP_DONE                        = 5310
export type resolve_t = (aaa:any)=>void;
export type RunAt= "ENG_START" | "COMM_START";
type PIAction={
    FLAG?:string;
    TOKEN?:string;
    MSG?:string;
    PROJECT_NUMBER?:string;
}
type FirstCheckReply={
    FLAG?:string;
    ERR?:string|string[];
}

type AppUpdateReply = {
    FLAG?: string;
    ERR?: string;
    URL?: string;
    APP_ID?: string;
    VER?: string;
}

type AppLocaleReply= {
    FLAG?: string;
    ERR?: string;
    URL?: string;
    VER?: string;
}

type DeviceProfileContent = {
    WORK_DIRECTORY?:string;
    CACHE_PATH?:string ;
    DEPLOY?:string;
    X_DPI?:number;
    Y_DPI?:number;
    DEVICE_LOG_LEVEL?:number;
}
type DeviceProfileReply= {
    FLAG?: string;
    CONTENT?:DeviceProfileContent;
    VER?:string;
}
type ManifestReply=AppLocaleReply;
type EngineLocalReply=AppLocaleReply;

type EngineUpdateReply= {
    FLAG?: string;
    VER?: string;
}
/*
 "INSTR": {
        "FLAG": "Y",
        "URL": "mobile-manager/instr",
        "CONTENT": {
            "INSTR": "GET_LOG,GET_WORKING_FOLDER,GET_DBN,GET_DBN,GET_DBN,GET_WORKING_FOLDER,GET_DBN,GET_LOG,GET_WORKING_FOLDER"
        },
        "VER": "2019-11-07 09:41:48.3850000,2019-11-08 09:41:48.3850000,2019-11-09 09:41:48.3850000,2019-11-14 03:15:02.9480000,2019-12-10 09:41:48.3850000,2019-12-11 09:41:48.3820000,2019-12-11 09:41:48.3830000,2019-12-11 09:41:48.3840000,2020-01-22 09:41:48.3850000"
    },
"INSTRJ_ENG": {
        "FLAG": "Y",
        "URL": "mobile-manager/instrj-result",
        "CONTENT": {
            "INSTR_URL": "mobile-manager/instrj/JavascriptInstructionTemplate.js"
        },
        "VER": "2019-11-12 02:43:44.142000000"
    },
*/
type InstrReply= {
    FLAG: string;
    ERR?: string;
    URL?: string;
    CONTENT:{
        INSTR?:string; //
    }
    VER?: string;
}
type InstrUrlReply= {
    FLAG: string;
    URL?: string;
    CONTENT:{
        INSTR_URL?:string; //
    }
    VER?: string;
}
export interface FirstCheckResult{
    CLIENT_REQUEST_DT:string;
    APP_UPDATE?:AppUpdateReply;
    APP_LOCALE?:AppLocaleReply;
    DEV_PROFILE?:DeviceProfileReply;

    NEW_MANIFEST?:string; //version 1.0
    MANIFEST?:ManifestReply;//version 1.1

    ENG_LOCALE?:EngineLocalReply;
    ENG_UPDATE?:EngineUpdateReply;
    STORAGE_CONFIG?:FCStorage;
    INSTR?:InstrReply;


    PI_ACTION?:PIAction; //play integrity action
    FIRST_CHECK:FirstCheckReply;
    INSTRJ_APP?:InstrUrlReply;
    INSTRJ_ENG?:InstrUrlReply;
    INSTRJ_COMM?:InstrUrlReply;
}

function ISOString() {
    return new Date().toISOString();
}
const VersionFile = FirstCheckDir     +'/Version.json';
const ManifestFilePath = FirstCheckDir +'/Manifest.json';

// async function uploadTxnsAsyncOnEngineStart(progress?: ProgressReportFunc) {
//     let appid = gHttpMobileManager.GetAppId();
//     if (appid === "")
//         return { success: true, error: "" };
//     Logger.Event("upload txn because new app or new manifest file is available")
//     let progress_wrapper = progress || make_progress_reporter();
//     return await gHttpDataSync.DoUploadTxnAsync(progress_wrapper,null);
// }

type FinalResult = { success: boolean, restart: boolean};
type MaybeFirstCheckResult= { success: boolean, detail?: string, data?:FirstCheckResult};

export let gHttpMobileManager = new (class {
  AppIDFromAppPackage: string = '';
  // RestartApp(){
  //     let appid = this.AppIDFromAppPackage;
  //     this.AppIDFromAppPackage = "";
  //     if(appid!=="") {
  //         Logger.Event("Restart app: " + appid);
  //         NP_LaunchApp(appid);
  //         return appid;
  //     }
  //     else {
  //         Logger.Event("Restart app");
  //         Restart();
  //         return this.GetAppId();
  //     }
  // }
  // DownloadHttpHeader(token: string) {
  //     return 'Authorization:Bearer ' + token;
  // }

  // HttpHeader(token: string) {
  //     return 'Accept:application/json;\nContent-Type:application/json; charset=utf-8\nAuthorization:Bearer ' + token;
  // }

  HttpEscapeHeader(token: string) {
    return (
      'Accept:application/json;\\nContent-Type:application/json; charset=utf-8\\nAuthorization:Bearer ' +
      token
    );
    //return this.HttpHeader(token).replace(/\\/gi, '\\\\');
  }
  CompleteUrl(apiUrl: string) {
    apiUrl = apiUrl.trim();

    if (!apiUrl.endsWith('/')) apiUrl += '/';

    if (apiUrl.endsWith('api/')) {
      apiUrl += 'v1.1/';
    } else if (
      !apiUrl.endsWith('api/v1.0/') &&
      !apiUrl.endsWith('api/v1.1/') &&
      !apiUrl.endsWith('api/v1.2/')
    ) {
      apiUrl += 'api/v1.1/';
    }
    return apiUrl;
  }
  GetBaseURL(url: string | undefined=undefined) {
    gAuth.LoadUserInfo();
    if (gAuth.UserInfoJSON && gAuth.UserInfoJSON.base_url) {
      return this.CompleteUrl(gAuth.UserInfoJSON.base_url);
    } else  {
        return url?this.CompleteUrl(url):'';
        //return '';
      //return "https://accentureacme-qa-mobile-comm-svc-qa.cfapps.jp10.hana.ondemand.com";
    }
  }

  GetUserId() {
    gAuth.LoadUserInfo();
    if (gAuth.UserInfoJSON && gAuth.UserInfoJSON.user_id) {
      return gAuth.UserInfoJSON.user_id;
    } else {
      return '';
    }
  }

  GetUserPassword() {
    gAuth.LoadUserInfo();
    if (gAuth.UserInfoJSON && gAuth.UserInfoJSON.password) {
      return gAuth.UserInfoJSON.password;
    } else {
      return '';
    }
  }
  CommServiceURL() {
    return this.GetBaseURL();
  }

  MobileServiceURL() {
    return this.GetBaseURL() + 'mm/';
  }

  GetAppId() {
    //let savedAppName = this.GetVersionInfo('APP_ID');
    //the code combined engine is "_custom_Eval"
    //let runningAppName = GetAppName().replace(/(_custom)?(_Eval)?$/gi, "");
    //if (runningAppName === 'NPApplication')
    //    runningAppName = savedAppName;
    //return runningAppName;
    return this.GetVersionInfo('APP_ID');
  }

  SaveVersionInfo(key: string, value: string) {
    let versionInfo = {};
    try {
      versionInfo = JSON.parse(NativeNPSync.LoadFile(VersionFile));
      (<any>versionInfo)[key] = value;
    } catch (error) {
      versionInfo = {};
      (<any>versionInfo)[key] = value;
    }
    NativeNPSync.WriteFile(VersionFile, JSON.stringify(versionInfo), 'w');
  }
  // "APP_ID":"SFA",
  // "MANIFEST_VER":"2021-03-17 07:28:32.977000000",
  // "DEV_PROFILE_VER":"2020-07-03T07:35:39.264Z",
  // "APP_UPDATE_VER":"9.0.0.1_20210324C"
  GetVersionInfoObject() {
    try {
      let versionInfo = JSON.parse(NativeNPSync.LoadFile(VersionFile));
      return !versionInfo ? {} : versionInfo;
    } catch (error) {
      return {};
    }
  }

  GetVersionInfo(key: string) {
    try {
      let versionInfo = JSON.parse(NativeNPSync.LoadFile(VersionFile));
      let keyVersionInfo = versionInfo[key];
      return !keyVersionInfo ? '' : keyVersionInfo;
    } catch (error) {
      return '';
    }
  }

  LoadManifestFile() {
    try {
      return JSON.parse(NativeNPSync.LoadFile(ManifestFilePath));
    } catch (error) {
      return null;
    }
  }

  // SaveManifestFile(manifestJSON: any) {
  //     WriteFile(ManifestFilePath, JSON.stringify(manifestJSON), 'w');
  //     this.SaveVersionInfo('MANIFEST_VER', manifestJSON.MANIFEST_DATE_VER);
  // }

  MMLog(jsonObj: ReportArg) {
    Logger.Event('system event: ' + JSON.stringify(jsonObj));
  }

  async FirstCheckUI (runAt:RunAt, dataInToken?:DataInToken,progress?: ProgressReportFunc, fcData?:FirstCheckResult) {
    let onFirstCheckPostInit  = async (finalResult: FinalResult) => {
          let retries=0;
          while(!dataInToken && (retries++) <3 ) {
              dataInToken = (await gAuth.GetTokenInfoAsync(progress)) || undefined;
          }
          if(!dataInToken){
              //deferExit(false,"")
              //await WaitForPromiseT('cannot got , `error: ${tokenReply.error}`, gAuth.delay(20000));
              return ;
          }

          this.MMLog({ cat: 'MMSvcs', subCat: 'FirstCheck', name: '', status: 'start' });
          //dlg.LBL_Desc.value = '(IDS_HTTPCOMM_FIRSTCHECK)' //FirstCheck
          let validation ;
          //Logger.Event(`onFirstCheckPostInit: fcData=${JSON.stringify(fcData)}`);
          if (!fcData) {
              validation = await this.FirstCheckValidationAsync(runAt, dataInToken);

              if (!validation || !validation.success || !validation.data) {
                  //deferExit(true, validation.detail??"" )
                  await WaitForPromiseT('first check' , `error: ${validation.detail??""}`, gAuth.delay(5000));
                  return;
              }
              fcData = validation.data;
          }
          let result = { success: false, restart: false };
          // if (fcData && this.ShouldUploadTxn(runAt, fcData)) {
          //     // should always upload transactions
          //     //if (runAt == "ENG_START") {
          //         let ret = await uploadTxnsAsyncOnEngineStart(progress);
          //         if (ret.success === false) {
          //             deferExit(true, ret.error??"")
          //             return;
          //         }
          //     //}
          // }
          // FirstCheck download new updates if needed
          //fcData = fcData || validation?.data;
          result = await this.ProcessFirstCheckReplyAsync(runAt, dataInToken, fcData, (status: ReportArg) => {
              let localisedSubCat = '';
              if (status.subCat === "DownloadJSEngineInstruction" || status.subCat === "DownloadJSAppInstruction" || status.subCat === "DownloadJSCommInstruction" ) {
                  localisedSubCat = '(IDS_MM_DOWNLOADING_INSTRUCTIONS)'; // Downloading Server Instruction
              } else if (status.subCat === "ProcessInstruction") {
                  localisedSubCat = '(IDS_MM_PROCESSING_INSTRUCTIONS)'; // Processing Server Instruction
              } else if (status.subCat === "DownloadManifest") {
                  localisedSubCat = '(IDS_MM_DOWNLOADING_COMMS_SETTINGS)'; // Downloading Comms Settings
              } else if (status.subCat === "DownloadDeviceProfile") {
                  localisedSubCat = '(IDS_MM_DOWNLOADING_DEVICE_SETTINGS)'; // Downloading Device Settings
              } else if (status.subCat === "DownloadEngineLocale") {
                  localisedSubCat = '(IDS_MM_DOWNLOADING_ENGINE_SETTINGS)'; // Downloading Engine Settings
              } else if (status.subCat === "DownloadAppLocale") {
                  localisedSubCat = '(IDS_MM_DOWNLOADING_APP_SETTINGS)'; // Downloading Application Settings
              } else if (status.subCat === "DownloadApp") {
                  localisedSubCat = '(IDS_MM_DOWNLOADING_APPLICATION)'; // Downloading Application
              }

              let statusText = localisedSubCat + ' ';
              if (status.current) {
                  let current = status.current;
                  let total = status.total;
                  if (total && total > 1) {
                      let percentage = Math.ceil((current / total) * 100);
                      statusText = statusText + percentage.toString() + '%';
                  }else{ //<=1 means the total length is unknown
                      if(current>100*1000) {
                          let kbytes= Math.ceil(current /1000);
                          statusText = statusText + kbytes + ' kbytes';
                      }else
                          statusText = statusText + current + ' bytes';
                  }
              }
              else {
              //     //Logger.Event({ cat: status.cat, subCat: status.subCat, name: status.name, status: status.status, detail: status.detail });
                   this.MMLog(status);
              }
              ChangeCommPrompt('MMsvc',statusText, true);

          });
          //}
          finalResult.success = result.success;
          finalResult.restart = result.restart;
          let desc:string;
          if (result.success) {
              this.MMLog({ cat: 'MMSvcs', subCat: 'FirstCheck', name: '', status: 'completed' });
              desc = '(IDS_PRN_SETUP_DONE)';
              //ChangeCommPrompt('MMSvcs', '(IDS_PRN_SETUP_DONE)',true); // Done
          } else {
              this.MMLog({ cat: 'MMSvcs', subCat: 'FirstCheck', name: '', status: 'failed'});
              desc = '(IDS_HTTPCOMM_SYSTEM_ERROR)';
              //dlg.LBL_Desc.value = '(IDS_HTTPCOMM_SYSTEM_ERROR)'; // System error. Please try again. If error persists, please contact Administrator.
              //ChangeCommPrompt('MMSvcs', '(IDS_PRN_SETUP_DONE)',true); // Done
          }
          await WaitForPromiseT('MMSvcs', desc, gAuth.delay(1000));
      }

      let finalResult = { success: false, restart: false };
      await onFirstCheckPostInit(finalResult);
      return finalResult;
  }



  async FirstCheckValidationAsync(run_at: RunAt, dataInToken: DataInToken):Promise<MaybeFirstCheckResult>{
      Logger.Event("Request first check user validation from server.");
      let reply= await this.HttpFirstCheckAsync(run_at, dataInToken);
      if (reply && reply.rsp_data && reply.rsp_code === 200) {
          try {
              let firstCheckResult = toJson(reply.rsp_data);
              // if (GetEngineType() === 'AND' && run_at === 'ENG_START' && firstCheckResult.PI_ACTION) {
              //     return await this.ProcessPIAction(run_at, dataInToken, firstCheckResult);
              //} else
              if (firstCheckResult.FIRST_CHECK) { // Version 1.1
                  if (await this.ValidateFirstCheckReply(dataInToken, firstCheckResult.FIRST_CHECK)) {
                      Logger.Event("FirstCheck validation passed.");
                      return { success: true, data: firstCheckResult };
                  } else {
                      // Don't need to log error here because ValidateFirstCheckReply already logged them. Prevent double alert.
                      return { success: false, detail: 'FirstCheck validation fail' };
                  }
              } else {
                  Logger.Error(`FirstCheck validation fail to get proper response from server: ${reply.rsp_data}`) ;
                  return { success: false, detail: 'FirstCheck validation fail to get proper response from server' };
              }
          } catch (e) {
              Logger.Error("FirstCheck validation failed: " + e) ;
              return { success: false, detail: ""+e };
          }
      } else if (reply.error_code === NoNetwork || reply.error_code == ConnectionError ) {
          // 2710: No network available. Please ensure that network connection is available and then try again.
          // 4025: MMSvcs
          await CommAlert('IDS_HTTPCOMM_NO_NETWORK', 'IDS_MM_DIALOG_TITLE');
          return { success: false, detail: "Unable to perform FirstCheck validation, no network connection." };
      }else if (isTimeoutResponse(reply)) {
          // 2714:Server did not respond
          // 4025: MMSvcs
          await CommAlert('(IDS_HTTPCOMM_NO_RESPONSE)', '(IDS_MM_DIALOG_TITLE)');
          return { success: false, detail: "Unable to perform FirstCheck validation, server has no response." };
      }
      else {
          Logger.Error(`FirstCheck validation fail to get proper response from server: ${reply.rsp_data}`) ;
          return { success: false, detail: 'FirstCheck validation fail to get proper response from server' };
      }
  };

  // async ProcessPIAction(run_at: string, dataInToken: DataInToken, firstCheckResult: FirstCheckResult, numAttempts = 0): Promise<MaybeFirstCheckResult> {
  //     if (numAttempts >= 2) {
  //         Logger.Error("MMSvcs playintegrity validation failed. Exceeds max(3) attempts.");
  //         if (!IsDevEngine()) Alert.alert('(IDS_MM_SAFETYNET_EXCEPTION)'); // SafetyNet checking exception has happened. Please try again. If problem persists, contact Administrator.
  //         __EngineAbort();
  //         return { success: false, detail: "Server playintegrity validation exceeds max attempts" };
  //     }
  //
  //     let piAction = firstCheckResult.PI_ACTION;
  //     if (/*true*/piAction?.FLAG == "90") {
  //         //Logger.Event(`MMSvcs get PlayIntegrity reply(90): project number:${piAction?.PROJECT_NUMBER}, token:${piAction?.TOKEN}, resend firstcheck(${numAttempts+1})`);
  //         Logger.Event('MMSvcs get PlayIntegrity reply(90): will re-generate PI JWTToken and send FirstCheck again');
  //         let secondFirstCheck = await this.HttpFirstCheckAsync(run_at, dataInToken, piAction.TOKEN, piAction.PROJECT_NUMBER, numAttempts+1);
  //         let secondFirstCheckData = JSON.parse(secondFirstCheck.rsp_data);
  //         return await this.ProcessPIAction(run_at, dataInToken, secondFirstCheckData, ++numAttempts);
  //     } else if (piAction?.FLAG == "00") {
  //         Logger.Event("MMSvcs playintegrity validation success");
  //         return { success: true, data: firstCheckResult };
  //     } else if (piAction?.FLAG == "91") { //rooted device?
  //         Logger.Event(`MMSvcs get PlayIntegrity reply(91): ${JSON.stringify(piAction)})`);
  //         PurgeAppData();
  //         __EngineAbort();
  //         return { success: false, detail: "Received playintegrity FLAG 91" };
  //     } else if (piAction?.FLAG == "92") {
  //         Logger.Event("MMSvcs playintegrity validation received FLAG 92, server has internal error");
  //         if (!IsDevEngine()) Alert.alert('(IDS_MM_SAFETYNET_EXCEPTION)'); // SafetyNet checking exception has happened. Please try again. If problem persists, contact Administrator.
  //         return { success: false, detail: "Received playintegrity FLAG 92" };
  //     } else {
  //         Logger.Error(`MMSvcs playintegrity validation failed. Received invalid server response: ${JSON.stringify(piAction)}`);
  //         if (!IsDevEngine()) Alert.alert('(IDS_MM_SAFETYNET_EXCEPTION)'); // SafetyNet checking exception has happened. Please try again. If problem persists, contact Administrator.
  //         __EngineAbort();
  //         return { success: false, detail: "Received invalid playintegrity action" };
  //     }
  // }

  // ShouldUploadTxn(run_at: string, firstCheckResult?: FirstCheckResult) {
  //
  //     //Logger.Event(`ShouldUploadTxn`);
  //     //if (run_at === 'COMM_START') return false;
  //     let ret = ((firstCheckResult?.MANIFEST?.FLAG === 'Y' || firstCheckResult?.APP_UPDATE?.FLAG === 'Y')
  //            && !!this.GetVersionInfo("MANIFEST_VER")) || firstCheckResult?.APP_UPDATE?.FLAG==='Y' ;
  //     //alert("should upload txn = "+ret);
  //     return ret;
  //
  //     // if (firstCheckResult && firstCheckResult.MANIFEST && firstCheckResult.APP_UPDATE
  //     //     && firstCheckResult.MANIFEST.FLAG && firstCheckResult.APP_UPDATE.FLAG) {
  //     //     return (firstCheckResult.MANIFEST.FLAG == 'Y' || firstCheckResult.APP_UPDATE.FLAG == 'Y');
  //     // } else return false; // This should not happen
  // }

  async DownloadPackageFileAsync(serverFilePath:string, progress:NetProgressReportFunc, dataInToken:DataInToken ,remark:object):Promise<IHttpResponse|null> {
      let downloadRequest ;
      let storageType = gStorageConfig.GetStorageInfo('TYPE');
      if (storageType === 'S3_DIRECT') {
          //        if (Math.floor(Math.random() * Math.floor(3))==2)// 1/3 chance to hit failure
          //            serverFilePath = `/${serverFilePath}x`;

          if (serverFilePath.startsWith("/"))
              serverFilePath = serverFilePath.substring(1);
          downloadRequest = await gS3.DownloadFile(`/${serverFilePath}`, progress ,remark);
      } else /*if (storageType === 'OBJECT_STORE_SVC')*/ {
          let serverURL = gStorageConfig.GetStorageInfo('URL') as string;
          //let header = this.DownloadHttpHeader(dataInToken.AcessToken);
          if (serverURL.endsWith("/")) serverURL = serverURL.slice(0, -1);
          let fullServerURL = `${serverURL}/download/storage/${serverFilePath}`;
          //        if (Math.floor(Math.random() * Math.floor(3))==2)// 1/3 chance to hit failure
          //            fullServerURL = `${serverURL}/downloadx/storage/${serverFilePath}`;
          downloadRequest = await gHttpAsync.DownloadFileWithTokenAsync(fullServerURL, 'POST', dataInToken, '', (download_progress) => {
              if (download_progress.done !== undefined && download_progress.total !== undefined) {
                  progress({ current: download_progress.done, total: download_progress.total });
              }
          },remark );
      }
      /*else {
          Logger.Error(`DownloadPackageFileAsync - Unknown storage type "${storageType}"`);
      }*/
      return downloadRequest;
  }

  private async DownloadFirstCheckFile(key: string, subCat: string, url: string,
      progress_report: ProgressReportFunc, dataInToken: DataInToken, numAttempts = 0): Promise<FinalResult> {
      const maxRetry = 3;
      let downloadRequest = await this.DownloadPackageFileAsync(url, (network_progress) => {
          progress_report(Object.assign({ cat: 'MMSvcs', subCat: subCat, name: '', status: 'progress' }, network_progress));
      }, dataInToken, { fileType: key, fileUrl: url });
      if (downloadRequest && downloadRequest.rsp_code === 200) { // Download success
          this.ProcessDownloadedFile(key, downloadRequest);

          if (subCat === 'DownloadApp' || subCat === 'DownloadEngineLocale' || subCat === 'DownloadAppLocale') {
              return { success: true, restart: true };
          } else {
              return { success: true, restart: false };
          }
      } else if(downloadRequest) { // Download fail
          let fileData = gHttpAsync.GetFileContent(downloadRequest);
          //Logger.Warn(subCat + ': download fail, ' + url + ', bad content received:' + fileData);
          NativeNPSync.DeleteFile(downloadRequest.rsp_data || '');

          if (maxRetry > numAttempts) {
              Logger.Event('Retrying download: ' + url);
              return await this.DownloadFirstCheckFile(key, subCat, url, progress_report, dataInToken, ++numAttempts);
          } else {
              Logger.Error(subCat + ': download fail, ' + url + ', bad content received:' + fileData);
              return { success: false, restart: false };
          }
      }else
          return { success: false, restart: false };
  }
  private ProcessDownloadedFile(name: string, file: IHttpResponse) {
      if (name === 'APP_UPDATE' || name === 'APP_LOCALE' || name === 'ENG_LOCALE') {
          // let originFile = file.rsp_data;
          // let destFile = originFile + '.zip';
          // MoveFile(originFile, destFile);
          // if(name === 'APP_UPDATE') {
          //     this.AppIDFromAppPackage = String(ExecuteApp('UnpackApp ' + destFile));
          //     if(this.AppIDFromAppPackage === "false")
          //     {
          //         Logger.Write(error_lvl,"Cannot unpack app update file");
          //         //this.AppIDFromAppPackage = "";
          //         Alert.alert("Cannot unpack app update file");
          //         this.AppIDFromAppPackage = "";
          //
          //     }
          // }else if(name === 'ENG_LOCALE') {
          //     ExecuteApp('UnzipToEngineDataFolder ' + destFile);
          // }
          // else
          //     ExecuteApp('Unzip ' + destFile);
          // DeleteFile(destFile);
      } else if (name === 'MANIFEST') {
          let originFile = file.rsp_data||"";
          NativeNPSync.MoveFile(originFile, ManifestFilePath,true);
      } else if (name === 'INSTRJ_ENG' || name === 'INSTRJ_APP' || name === 'INSTRJ_COMM') {
          // let originFile = file.rsp_data;
          // let destFile = name + '.js';
          // MoveFile(originFile, destFile);
      }
  }
  private ProcessFCStorage(storage:FCStorage): boolean {
      if (storage.FLAG !== "S") {
          Logger.Error("STORAGE_CONFIG Err: " + storage.ERR);
          return false;
      } else {
          gStorageConfig.WriteToFile(storage);
          return true;
      }
  }
  // private async ProcessStringInstruction(result:InstrReply, progress_report:ProgressReportFunc, dataInToken:DataInToken) {
  //     if(!result || !result.CONTENT || !result.CONTENT.INSTR)
  //         return true;
  //
  //     let instructionsString = result.CONTENT.INSTR;
  //     let instructionsArray = instructionsString.split(',');
  //
  //     let versionsString = result.VER??"";
  //     let versionsArray = versionsString.split(',');
  //
  //     let tempPath = __GetHttpTmpFolder() + '/';
  //     let uploadFolder = '';
  //
  //     for (let [index, instruction] of instructionsArray.entries()) {
  //         let filename = instruction + '-' + new Date().getTime() + '.zip';
  //         let zipFile = tempPath + filename; // Files that needs to be uploaded will be zipped into here
  //         //if (ExistFile(zipFile)) DeleteFile(zipFile);
  //         DeleteFile(tempPath,instruction+'-*.zip');
  //
  //         let url = result.URL??"";
  //         if (!url.endsWith('/')) url += '/';
  //         let serverFilePath = url + filename;
  //
  //         let version = versionsArray[index];
  //         progress_report({ cat: 'MMSvcs', subCat: 'ProcessInstruction', name: '', status: 'start', detail: instruction });
  //         Logger.Event(`Starting processing instruction: ${instruction}`);
  //
  //         if (instruction === 'GET_DBN') {
  //             let appId = gHttpMobileManager.GetAppId();
  //             uploadFolder = appId + 'DBN';
  //         } else if (instruction === 'GET_LOG') {
  //             uploadFolder = 'logs';
  //         } else if (instruction === 'GET_WORKING_FOLDER') {
  //             uploadFolder = GetApplicationPath();
  //         } else {
  //             if (instruction.includes('WIPEOUT')) {
  //                 let hardwareId = instruction.replace('WIPEOUT:', '');
  //                 if (hardwareId === GetHardwareId()) {
  //                     await this.SubmitStringInstructionResultAsync(version, 'S', '', dataInToken);
  //                     Alert.alert('(IDS_MM_DEVICE_WIPEOUT)'/*The application and data will all be deleted.*/, '(IDS_MM_DIALOG_TITLE)'/*MMSvcs*/);
  //                     __DeleteFolder(GetApplicationPath());
  //                     return false;
  //                 } else {
  //                     continue;
  //                 }
  //             } else {
  //                 progress_report({ cat: 'MMSvcs', subCat: 'ProcessInstruction', name: '', status: 'failed', detail: 'invalid instruction ' + instruction });
  //                 Logger.Error('INSTR: received invalid instruction ' + instruction);
  //                 continue;
  //             }
  //         }
  //
  //         if (ExecuteApp('Zip -o' + zipFile + ' ' + uploadFolder + '\\*')) {
  //             let uploadRsp= await this.UploadPackageFileAsync({
  //                 filePath: zipFile, serverFilePath, progress: (network_progress) => {
  //                     let progress = { current: network_progress.current, total: network_progress.total };
  //                     progress_report(Object.assign({ cat: 'MMSvcs', subCat: 'ProcessInstruction', name: '', status: 'progress', detail: instruction }, progress));
  //                 },dataInToken
  //             });
  //             DeleteFile(zipFile);
  //             if (!uploadRsp) {
  //                 progress_report({ cat: 'MMSvcs', subCat: 'ProcessInstruction', name: '', status: 'failed', detail: 'Unable to upload package missing storage config' });
  //                 Logger.Error(`Failed to upload instruction package. Missing storage config.`);
  //                 return false;
  //             }
  //             // Upload result to server
  //             let resultRequest;
  //
  //             if (uploadRsp.rsp_code === 201 || uploadRsp.rsp_code === 200) {
  //                 resultRequest = await this.SubmitStringInstructionResultAsync(version, 'S', serverFilePath, dataInToken);
  //             } else {
  //                 resultRequest = await this.SubmitStringInstructionResultAsync(version, 'F', '', dataInToken);
  //             }
  //
  //             if (resultRequest.rsp_code === 200) {
  //                 progress_report({ cat: 'MMSvcs', subCat: 'ProcessInstruction', name: '', status: 'completed', detail: serverFilePath });
  //                 Logger.Event(`Successfully processed instruction: ${instruction}`);
  //             } else {
  //                 progress_report({ cat: 'MMSvcs', subCat: 'ProcessInstruction', name: '', status: 'failed', detail: 'Unable to send results back to server' });
  //                 Logger.Error(`Fail to send instruction back to server: ${instruction}`);
  //             }
  //         } else {
  //             progress_report({ cat: 'MMSvcs', subCat: 'ProcessInstruction', name: '', status: 'failed', detail: 'Unable to zip folder for upload' });
  //             Logger.Error(`Failed to zip package for instruction: ${instruction}`);
  //         }
  //         this.SaveVersionInfo('INSTR_VER', version);
  //     }
  //     // Finished handling all the instructions
  //     return true;
  // };
  // private ProcessDeviceProfile (content:DeviceProfileContent) {
  //     let WORK_DIRECTORY = content.WORK_DIRECTORY;
  //     let CACHE_PATH = content.CACHE_PATH;
  //     let DEPLOY = content.DEPLOY;
  //     let X_DPI = content.X_DPI;
  //     let Y_DPI = content.Y_DPI;
  //     let DEVICE_LOG_LEVEL = content.DEVICE_LOG_LEVEL;
  //     let data = '[DEVICE]\n';
  //     if (WORK_DIRECTORY) data = data + 'WORK_DIRECTORY=' + WORK_DIRECTORY + '\n';
  //     if (CACHE_PATH) data = data + 'CACHE_DIRECTORY=' + CACHE_PATH + '\n';
  //     if (DEPLOY) data = data + 'RELEASE_EDITION=' + DEPLOY + '\n';
  //     if (X_DPI) data = data + 'X_DPI=' + X_DPI + '\n';
  //     if (Y_DPI) data = data + 'Y_DPI=' + Y_DPI + '\n';
  //     if (DEVICE_LOG_LEVEL) data = data + 'DEVICE_LOG_LEVEL=' + DEVICE_LOG_LEVEL + '\n';
  //     Logger.Data('DEV_COMP_PROFILE: \n' + data);
  //     //Insert device profile
  //     return UpdateEngineProfile(data);
  // };
  async ProcessFirstCheckReplyAsync(run_at: RunAt, dataInToken: DataInToken, firstCheckResult:FirstCheckResult,
                                    progress_report: ProgressReportFunc) {
      // if (/*true*/firstCheckResult.ENG_UPDATE && firstCheckResult.ENG_UPDATE.FLAG === "Y" && GetEngineType() !== "WINSA") {
      //     if (GetEngineType() === "AND") {
      //         // There is a new engine in Play Store. If you click on OK, you will be directed there to download it.
      //         Alert.alert('(IDS_MM_DOWNLOADING_NEW_ENG_AND)', '(IDS_MM_DIALOG_TITLE)');
      //     } else if (GetEngineType() === "IOS") {
      //         // There is a new engine in App Store. If you click on OK, you will be directed there to download it.
      //         Alert.alert('(IDS_MM_DOWNLOADING_NEW_ENG_IOS)', '(IDS_MM_DIALOG_TITLE)');
      //     }
      //     Logger.Event("Redirecting to AppStore");
      //   __RedirectToAppStore();
      //   return { success: true, restart: false };
      // }
      let finalResult = { success: true, restart: false };
      // let HandleInstrUrl = async (key: string, subCat: string, value?: InstrUrlReply)=>{
      //     if(!value || !value.CONTENT || !value.CONTENT.INSTR_URL)
      //        return true;
      //     progress_report({ cat: 'MMSvcs', subCat, name: '', status: 'start' });
      //     let result = await this.DownloadFirstCheckFile(key, subCat, value.CONTENT.INSTR_URL, progress_report, dataInToken);
      //     if (result.success) {
      //         this.SaveVersionInfo(key + '_VER', value.VER??"");
      //
      //         // Ignore App Instructions now,  will run it when app start
      //         if (key === 'INSTRJ_APP') {
      //             progress_report({ cat: 'MMSvcs', subCat: subCat, name: '', status: 'completed' });
      //             return true;
      //         }
      //
      //         // Execute Javascript instructions
      //         let javascriptResult = false;
      //         if (run_at === 'ENG_START') {
      //             javascriptResult = this.RunJavascriptInstruction('INSTRJ_ENG', dataInToken);
      //         } else if (run_at === 'COMM_START') {
      //             javascriptResult = this.RunJavascriptInstruction('INSTRJ_COMM', dataInToken);
      //         }
      //
      //         if (javascriptResult) {
      //             progress_report({ cat: 'MMSvcs', subCat, name: '', status: 'completed' });
      //             return true;
      //         } else { // Execute instruction fail
      //             progress_report({ cat: 'MMSvcs', subCat, name: '', status: 'failed', detail: 'Unable to execute javascript instruction' });
      //             return false;
      //             //return { success: false, restart: false };
      //         }
      //     } else { // Download fail
      //         progress_report({ cat: 'MMSvcs', subCat, name: '', status: 'failed' });
      //         return false;
      //         //return { success: false, restart: false };
      //     }
      // }
      // let HandleInstr = async (key: string, subCat: string, value?: InstrReply)=> {
      //     if(!value)
      //         return true;
      //
      //     if (value.FLAG === "F") {
      //         Logger.Error(`${subCat} Err: ${value?.ERR}`);
      //         return true;
      //     }
      //     let success = await this.ProcessStringInstruction(value, progress_report, dataInToken);
      //     if (success) return success;
      //     progress_report({ cat: 'MMSvcs', subCat, name: '', status: 'failed' });
      //     return false;
      //
      // }

      let HandleDownload = async (key:string, subCat:string, value?:AppUpdateReply)=>{
          if(!value || !value.URL)
              return true;

          if (value.FLAG === "F") {
              Logger.Error(`${subCat} Err: ${value?.ERR}`);
              return true;
          }

          let oldVersion = this.GetVersionInfo(key + '_VER')??"";
          Logger.Event(`Trying to update ${subCat} from version "${oldVersion}" to "${value.VER??""}"`);
          progress_report({ cat: 'MMSvcs', subCat: subCat, name: '', status: 'start' });
          let result = await this.DownloadFirstCheckFile(key, subCat, value.URL, progress_report, dataInToken);
          if (result.success) {
              if (key === 'APP_UPDATE')
                  this.SaveVersionInfo('APP_ID', value.APP_ID??"");
              this.SaveVersionInfo(key + '_VER', value.VER??"");
              if (result.restart) finalResult.restart = true;
              progress_report({ cat: 'MMSvcs', subCat: subCat, name: '', status: 'completed' });
              Logger.Event(`Downloaded ${subCat}, now version is ${value.VER??""}`);
              return true;
          } else {
              progress_report({ cat: 'MMSvcs', subCat: subCat, name: '', status: 'failed' });
              Logger.Event(`Failed to download ${subCat}, keep old version: "${oldVersion}"`);
              return false;
          }
      }
      // let HandleDevProfile=(key:string, subCat:string, value?:DeviceProfileReply)=>{
      //     if(!value || !value.CONTENT)
      //         return;
      //     this.ProcessDeviceProfile(value.CONTENT);
      //     this.SaveVersionInfo(key + '_VER', value.VER??"");
      // }
      if(firstCheckResult.STORAGE_CONFIG) {
          if (!this.ProcessFCStorage(firstCheckResult.STORAGE_CONFIG)) {
              finalResult.success = false;
              return finalResult;
          }
      }
      // if (run_at === 'ENG_START') {
      //     finalResult.success =  finalResult.success
      //         && await HandleInstrUrl("INSTRJ_ENG", "DownloadJSEngineInstruction", firstCheckResult.INSTRJ_ENG)
      //         && await HandleInstrUrl("INSTRJ_APP", "DownloadJSAppInstruction", firstCheckResult.INSTRJ_APP);
      // }else if (run_at === 'COMM_START')
      //     finalResult.success = finalResult.success
      //         && await HandleInstrUrl("INSTRJ_COMM", "DownloadJSCommInstruction", firstCheckResult.INSTRJ_COMM) ;

      // finalResult.success = finalResult.success &&
      //     await HandleInstr("INSTR", "ProcessInstruction", firstCheckResult.INSTR);
      finalResult.success = finalResult.success &&
          await HandleDownload("MANIFEST", "DownloadManifest", firstCheckResult.MANIFEST);
      //HandleDevProfile("DEV_PROFILE", "DownloadDeviceProfile", firstCheckResult.DEV_PROFILE);
      // if(finalResult.success) {
      //     //let oldLocalEngineVersion = this.GetVersionInfo("ENG_LOCAL_VER");
      //     finalResult.success = await HandleDownload("ENG_LOCALE", "DownloadEngineLocale", firstCheckResult.ENG_LOCALE);
      //     if (finalResult.success ) {
      //         let newLocaleEngineVersion = this.GetVersionInfo("ENG_LOCALE_VER");
      //         if( newLocaleEngineVersion === "")
      //         {
      //             //create empty engine locale file to ask engine not to download engine locale file from R7MM webservice.
      //             Logger.Event("new Locale EngineVersion is empty, create empty npengine.locale.profile too");
      //             UpdateLocaleProfile("");
      //
      //         }
      //     }
      // }
      // finalResult.success = finalResult.success &&
      //     await HandleDownload("APP_LOCALE", "DownloadAppLocale", firstCheckResult.APP_LOCALE);
      // finalResult.success = finalResult.success &&
      //     await HandleDownload("APP_UPDATE", "DownloadApp", firstCheckResult.APP_UPDATE);
      return finalResult;
  };

  private async HttpFirstCheckAsync(run_at: string, dataInToken: DataInToken ) {
      let engineVersion= '0.0.1'; //skip hardcoded "Version "
      //`${engineInfoObject.engine_version}_${engineInfoObject.build_version}`;
      //let header = this.HttpHeader(dataInToken.AcessToken);
      let body = {
          COMP_ID: dataInToken.CompanyId,
          DEV_USER_ID: dataInToken.UserId,
          HARDWARE_ID: GetHardwareId(),
          ENG_TYPE: 'AND',
          ENG_VER: engineVersion,
          RUN_AT: run_at,
          REQUEST_DT: ISOString(),
          DEV_PROFILE_VER:"",
          ENG_LOCALE_VER: "",
          APP_ID: this.GetAppId(),
          APP_VER: "",
          APP_LOCALE_VER: "",
          MANIFEST_VER: "",
          INSTR_VER: "",
          INSTRJ_ENG_VER: "",
          INSTRJ_APP_VER: "",
          INSTRJ_COMM_VER: "",
          DEVICE_INFO:{}
      };

      let deviceInfo = {
          HARDWARE_ID: GetHardwareId(),
          ENG_TYPE: 'AND',
          BUNDLE_ID: "",
          DPI: 160,
          SCREEN_WIDTH: 600,
          SCREEN_HEIGHT:800

      };
      body.DEVICE_INFO = deviceInfo;


      return await gHttpAsync.SendWebReqWithTokenAsync(this.MobileServiceURL() + 'first-check', 'POST', dataInToken, JSON.stringify(body));
  };
  //

      private async ValidateFirstCheckReply(dataInToken: DataInToken, result?: FirstCheckReply) {
          if (result?.FLAG === 'S') {
              return true;
          }
          let serverErrorMessage = 'Server message: ';
          if (result?.FLAG === 'F') {
              let error = result?.ERR;
              if (Array.isArray(error)) {
                  for (let i = 0; i < error.length; i++) {
                      serverErrorMessage += error[i];
                      serverErrorMessage += '\n';
                  }
              } else {
                  serverErrorMessage += result?.ERR;
              }
              let compId = dataInToken.CompanyId;
              let appId = this.GetAppId();
              let devUserId = dataInToken.UserId;
              let hardwareId = GetHardwareId();
              let engType = 'AND'
              let errorMessage = `Comp ID: ${compId}
  App ID: ${appId}
  Dev User ID: ${devUserId}
  Hardware ID: ${hardwareId}
  Eng Type: ${engType}
  `;
              if (IsDevEngine()) errorMessage = errorMessage + serverErrorMessage;
              Logger.Error(`FirstCheck Validation Fail: ${errorMessage}`);

              // Show localised error alert in Production engine
              if (!IsDevEngine())
                await CommAlert('(IDS_MM_USER_VALIDATION_FAIL)', '(IDS_MM_DIALOG_TITLE)'); // 4036: User validation failed. Please contact Administrator.
              return false;
          } else {
              Logger.Error('FirstCheck: unknown reply, ' + JSON.stringify(result));
              return false;
          }
      }

  // private async SubmitStringInstructionResultAsync(version:string, result:"S"|"F", uploadedURL:string, dataInToken:DataInToken) {
  //     let body = {
  //         COMP_ID: dataInToken.CompanyId,
  //         DEV_USER_ID: dataInToken.UserId,
  //         HARDWARE_ID: GetHardwareId(),
  //         APP_ID: this.GetAppId(),
  //         EXECUTE_DT: ISOString(),
  //         RESULT: result,
  //         UPLOADED_URL: uploadedURL,
  //         INSTR_VER: version
  //     };
  //     return await gHttpAsync.SendWebReqWithTokenAsync(this.MobileServiceURL() + 'instr/update-instr', 'POST', dataInToken, JSON.stringify(body));
  // }
})();