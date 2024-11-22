import {
    Logger,
    make_progress_reporter,
    ProgressReportFunc,
    TableSyncDefinition,
    WaitForPromiseT,
    LoginModeResult, TxnSector, RecreateLogger
} from "./Common";
// import { gHttpDataSync, TxnUploadParam } from "./HttpDataSync";
import { gHttpDataSync} from "./HttpDataSync";
import { gAuth } from "./OAuth";
import {gHttpMobileManager, RunAt, UserCredentialProvider} from './MobileManager';




function HttpCommSyncStop() {
    gHttpDataSync.StopCommSync();
}
async function HttpCommSync(progress: ProgressReportFunc, tblSyncNames: string[], firstCheck = true, distCd?: string) {
    gAuth.SetAPIVersion(1);
    RecreateLogger();
    let progress_wrapper = make_progress_reporter(progress);
    try {
        progress_wrapper({ cat: 'HttpCommSync', subCat: '', name: '', status: 'start' });
        let result = await gHttpDataSync.SyncDataAsync(progress_wrapper, tblSyncNames, firstCheck, distCd??"");
        if (result && result.success) {
            progress_wrapper({ cat: 'HttpCommSync', subCat: '', name: '', status: 'completed' });
        }
        else
            progress_wrapper({ cat: 'HttpCommSync', subCat: '', name: '', status: 'failed', detail: JSON.stringify(result) });
        return result.success;
    } catch (e) {
        progress_wrapper({ cat: 'HttpCommSync', subCat: '', name: '', status: 'failed', detail: JSON.stringify(e) });
        return false;
    }
}

// let g_SmartTxnUploaded = false;
// function Comm2EnableSmartTxnUploading(bEnable:boolean):boolean{
//     let old = g_SmartTxnUploaded ;
//     g_SmartTxnUploaded = bEnable;
//     __Comm2EnableSmartTxnUploading(bEnable);
//     return old;
// }
// function HttpCommStartUploadingTxn(progress: ProgressReportFunc, intervalInMs: number) {
//     //alert("HttpCommStartUploadingTxn intervalInMs="+intervalInMs);
//     let progress_wrapper = make_progress_reporter(progress);
//     Comm2EnableSmartTxnUploading(true);
//     gHttpDataSync.UploadAllTxnsNow(progress_wrapper, intervalInMs);
// }

// function HttpCommStopUploadingTxn():boolean {
//     //alert("HttpCommStopUploadingTxn");
//     let old = Comm2EnableSmartTxnUploading(false);
//     gHttpDataSync.StopBgTxnUploading();
//     return old;
// }

function GetUserInfo() {
    let userInfo = gAuth.LoadUserInfo();
    if (userInfo) return userInfo.user_info
    else return null;
}

// function __HttpCommSmartTxnUpload() {
//     gHttpDataSync.StartSmartTxnUploading();
// }
function GetTenantID() {
    let userInfo = gAuth.LoadUserInfo();
    if (userInfo) return userInfo.user_info.tenant_id
    else return null;
}
enum QueryType {QueryTenantID=0 ,QueryManifestVersion =1, QueryManifestTxnTables=2}
function HttpCommQueryInfo(key:QueryType) {
    switch (key) {
        case QueryType.QueryTenantID:
            return GetTenantID();
        case QueryType.QueryManifestVersion:
            return gHttpMobileManager.GetVersionInfo("MANIFEST_VER");
        case QueryType.QueryManifestTxnTables:
            let x=gHttpMobileManager.LoadManifestFile();
            if(x.TRANSACTION && x.TRANSACTION.DocType==='TRANSACTION'){
               let txn=x.TRANSACTION as TxnSector;
               let names = txn.Definitions.map((def)=>def.Name);
               names = names.filter((name)=>!name.endsWith("#FILE"))
               return names.join("|");
            }
            return ""
    }
    return "";
}
//remove it now
////this function will be removed later
// function HttpCommGetUserInfo() {
//     let userInfo = gAuth.LoadUserInfo();
//     if (userInfo) {
//         if(!userInfo.user_id  || !userInfo.password) {
//             let credential = gAuth.PromptLocalLogin();
//             if (credential.password && credential.userId) {
//                 userInfo.user_id = credential.userId;
//                 userInfo.password= credential.password;
//                 gAuth.SaveUserInfo();
//             }
//             return {
//                 login_info: {
//                     base_url: userInfo.base_url,
//                     user_id: userInfo.user_id,
//                     password: userInfo.password
//                 },
//                 user_info: userInfo.user_info
//            };
//         }
//     }
//     return {};
// }

// function HttpCommGetUserInfo() {
//     let ret = HttpCommGetUserInfo2();
//     alert("UserInfo?" + ret?.login_info?.user_id);
//     alert("UserInfo?" + JSON.stringify(ret));
//     return ret;
// }

function HttpCommGetGroupInfo(syncName: string) {
    let manifest = gHttpMobileManager.LoadManifestFile();
    let groups: string[] = [];
    if (manifest) {
        //{
        //   "Name": "routeplan-generator",
        //   "Group": "routeplan"
        //},
        if (typeof manifest === 'object' && manifest[syncName] && manifest[syncName].Definitions) {
            let defs = manifest[syncName].Definitions as TableSyncDefinition[];
            let set = new Set<string>([... defs.map((grp=>grp.Group))]);
            groups = [... set.keys()] ;
        }
    }
    return groups;
}

async function FirstCheck(runAt: RunAt | "DEFAULT_APP", userCredentialProvider:UserCredentialProvider): Promise<string> {
    if (runAt == "DEFAULT_APP")
        return gHttpMobileManager.GetAppId();
    if (runAt === "ENG_START" || runAt === "COMM_START") {
        if (runAt === "ENG_START")
            gAuth.SetAPIVersion(2);
        gHttpMobileManager.SetCredentialProvider(userCredentialProvider);
        await gHttpMobileManager.FirstCheckUI(runAt);
        // let restart = gHttpMobileManager.FirstCheckUI(runAt).restart;
        // //let loginResult = HttpLogin();
        // //alert("HttpLogin = "+loginResult);
        // if (restart) {
        //     return gHttpMobileManager.RestartApp();
        // }
        return gHttpMobileManager.GetAppId();
    }
    return "unknown";
}
// function RunJavascriptInstruction(key: string) {
//     let dataInToken = gAuth.GetCachedTokenInfo();
//     if (!dataInToken)
//         return false;
//     return gHttpMobileManager.RunJavascriptInstruction(key, dataInToken);
// }

// function HttpLogin(): string {
//     gAuth.SetAPIVersion(2);
//     let serverLoginModeResult: LoginModeResult | undefined;
//     let baseUrl = gHttpMobileManager.CommServiceURL();
//     if(!baseUrl) {
//         Logger.Error("HttpLogin is called before FirstLogin");
//         let ret = gAuth.GetTokenInfoWithUI();
//         if(!ret || !gHttpMobileManager.CommServiceURL())
//             return "F";
//     }
//     let userInfo = gAuth.LoadUserInfo();
//     if (userInfo != null) {
//         let loginMode = userInfo.login_mode;
//         // Backward compatibility for older engines.
//         if (loginMode === undefined) {
//             serverLoginModeResult = gAuth.getLoginModeUI(userInfo.base_url);
//             if(serverLoginModeResult.isNetworkError)
//                 return "F";
//             if (serverLoginModeResult.loginMode) {
//                 // Update the local login mode
//                 userInfo.login_mode = serverLoginModeResult.loginMode;
//                 gAuth.UserInfoJSON = userInfo;
//                 gAuth.SaveUserInfo();
//
//                 loginMode = serverLoginModeResult.loginMode;
//             } else {
//                 Logger.Error("HttpLogin: Unable to get login mode from server");
//                 return "F";
//             }
//         }
//
//         if (loginMode === "MOBILE"|| loginMode === "SSO_MOBILE") {
//             // Check if needs to refresh token
//             let expiryDate = new Date(userInfo.token_expiry_date);
//             if (userInfo.token_expiry_date.length <= 0 || gAuth.willExpireIn30Minutes(expiryDate)) {
//                 if (serverLoginModeResult === undefined) {
//                     serverLoginModeResult = gAuth.getLoginModeUI(userInfo.base_url);
//                     if(serverLoginModeResult?.isNetworkError)
//                         return "F";
//                 }
//                 if ( serverLoginModeResult?.loginMode === loginMode) {
//                     let refreshTokenResult = gAuth.RefreshTokenUI(userInfo.base_url, userInfo.refresh_token, loginMode);
//                     if (refreshTokenResult.success) {
//                         return "S";
//                     } else {
//                         if (gAuth.CommLoginUI(loginMode)) {
//                             return "S";
//                         } else {
//                             //Logger.Error("HttpLogin: 159");
//                             return "F";
//                         }
//                     }
//                 } else {
//                     if (serverLoginModeResult?.loginMode === "IDP" && serverLoginModeResult?.redirectUrl) {
//                         let idpResult = gAuth.getIDPAuthCode(baseUrl, serverLoginModeResult.redirectUrl);
//                         if (idpResult.success && idpResult.code) {
//                             let reply= WaitForPromiseT(NPGetText(IDS_HTTPCOMM_AUTH_DIALOG_TITLE), NPGetText(IDS_HTTPCOMM_AUTHENTICATION),
//                                 gAuth.getTokenFromServerAsync(baseUrl, {loginMode: "IDP", code: idpResult.code}));
//                             if (reply&& reply.success) {
//                                 return "L";
//                             } else {
//                                 //Logger.Error("HttpLogin: 180");
//                                 return "F";
//                             }
//                         } else {
//                             return "F";
//                         }
//                     }else if(serverLoginModeResult?.loginMode === "SSO_IDP") {
//                         let baseUrl = gHttpMobileManager.CommServiceURL();
//                         let reply= WaitForPromiseT(NPGetText(IDS_HTTPCOMM_AUTH_DIALOG_TITLE), NPGetText(IDS_HTTPCOMM_AUTHENTICATION),
//                             gAuth.getTokenFromServerAsync(baseUrl, {loginMode: "SSO_IDP"} ));
//                         if (reply && reply.success) {
//                             return "L";
//                         } else {
//                             //Logger.Error("HttpLogin: 231");
//                             return "F";
//                         }
//                     }else {
//                         return "F";
//                     }
//                 }
//             } else {
//                 return "S";
//             }
//         } else if (loginMode === "IDP"||loginMode === "SSO_IDP") {
//             return "L";
//         } else {
//             // Unknown login mode
//             Logger.Error(`HttpLogin: Invalid local LoginMode: ${loginMode}`);
//             return "F";
//         }
//     } else {
//         // Invalid user info
//         Logger.Error("HttpLogin: UserInfo is invalid");
//         return "F";
//     }
// }

/*
var tblSyncNames=[];
var firstCheck=false;
var distCd="" ;
var uploadtxt=true;
HttpCommSync2(cb, tblSyncNames, firstCheck, distCd, uploadtxt);
uploadtxt=["X_GPS","X_OTHER"];
HttpCommSync2(cb, tblSyncNames, firstCheck, distCd, uploadtxt);
async function HttpCommSync2(progress: ProgressReportFunc, tblSyncNames: string[], firstCheck = true, distCd ="", txnUpload=true ) {
 */
// async function HttpCommSync2(progress: ProgressReportFunc, tblSyncNames: string[], firstCheck = true, distCd ="", txnUpload:TxnUploadParam=true) {
//     // if("9.1.0.0_SYNC"===tblSyncNames[0]){
//     //     SetTimeout(() => {
//     //         alert("Will call HttpCommSyncStop");
//     //         HttpCommSyncStop();
//     //     }, 3 * 1000);
//     // }
//     RecreateLogger();
//     gAuth.SetAPIVersion(2);
//     //if(Array.isArray(txnUpload))
//     //    return true;
//     //else
//     //    alert("HttpCommSync2 firstCheck="+(firstCheck)+",txnUpload="+txnUpload);
//     let progress_wrapper = make_progress_reporter(progress);
//     try {
//         progress_wrapper({ cat: 'HttpCommSync', subCat: '', name: '', status: 'start' });
//         let distCd2 = distCd??""
//         let result = await gHttpDataSync.SyncDataAsync2(progress_wrapper, tblSyncNames, firstCheck, distCd2, txnUpload);
//         if (result && result.success) {
//             progress_wrapper({ cat: 'HttpCommSync', subCat: '', name: '', status: 'completed' });
//         }
//         else
//             progress_wrapper({ cat: 'HttpCommSync', subCat: '', name: '', status: 'failed', detail: JSON.stringify(result) });
//         return result.success;
//     } catch (e) {
//         progress_wrapper({ cat: 'HttpCommSync', subCat: '', name: '', status: 'failed', detail: JSON.stringify(e) });
//         return false;
//     }
// }

// function HttpCommGetServerURL():string
// {
//    let userInfo = gAuth.LoadUserInfo();
//    if(!userInfo)
//        return "";
//    return userInfo.base_url;
// }

// function HttpCommSetServerURL(newURL:string): void
// {
//     if(!newURL) {
//         Logger.Error("bad server url in HttpCommSetServerURL");
//         return;
//     }
//     let userInfo = gAuth.LoadUserInfo();
//     if(!userInfo) {
//         Logger.Error("Cannot set server url before first check");
//         return;
//     }
//     userInfo.base_url= newURL;
//     //reset token too
//     userInfo.access_token="bad";
//     userInfo.refresh_token="";
//     let date = new Date();
//     date.setDate(date.getDate()-1);
//     userInfo.token_expiry_date = date.toISOString();
//     gAuth.SaveUserInfo();
// }

function HttpCommClearJWT():void
{
    let userInfo = gAuth.LoadUserInfo();
    if(!userInfo) {
        return;
    }
    //reset token too
    userInfo.access_token="bad";
    userInfo.refresh_token="";
    let date = new Date();
    date.setDate(date.getDate()-1);
    userInfo.token_expiry_date = date.toISOString();
    gAuth.SaveUserInfo();
}

export {
    // HttpLogin,
    HttpCommSync,
    // HttpCommSync2,
    // HttpCommSyncStop,
    // HttpCommStartUploadingTxn,
    // __HttpCommSmartTxnUpload,
    // HttpCommStopUploadingTxn,
    HttpCommGetGroupInfo,
    //HttpCommSetServerURL,
    //HttpCommGetServerURL,
    HttpCommClearJWT,
    //GetUserInfo as __GetUserInfo,
    //HttpCommQueryInfo as __HttpCommQueryInfo,
    //FirstCheck as __FirstCheck,
    FirstCheck,
}


