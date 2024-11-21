import {
    CommAlert,
    DataInToken, FirstCheckDir, GetHardwareId,
    Logger,
    LoginModeResult,
    make_progress_reporter,
    ProgressReportFunc,
    toJson,
    WaitForPromiseT,
} from './Common';
import {gHttpMobileManager} from './MobileManager';
import {ConnectionError, gHttpAsync, isTimeoutResponse, NoNetwork} from './HttpAsync';
import NativeNPSync, {IHttpResponse} from '../specs/NativeNPSync.ts';

type TokenFromServerResult = {
    success: boolean,
    error: string,
    needChangePassword: boolean
}

// type IDPLoginResult = {
//     success: boolean,
//     code?: string,
//     error?: string
// }
//export type LoginMode="SSO_IDP"|"SSO_MOBILE"|"MOBILE"|"IDP";
// type UserCredentialIDP = {
//     loginMode:"IDP",
//     code:string
// }
// type UserCredentialSSO_IDP= {
//     loginMode:"SSO_IDP",
// }
// type UserCredentialSSO_MOBILE = {
//     loginMode:"SSO_MOBILE",
//     user:string,
//     password : string,
//     newPassword?:string
// }
export type LoginMode="MOBILE";
type UserCredentialUPW = {
    loginMode:"MOBILE",
    user:string,
    password : string
    newPassword?:string
}
type UserCredential = UserCredentialUPW;
const REDIRECT_URI="com.acnnp.htmlengine://oauth2";

const USER_INFO_FILEPATH = FirstCheckDir + '/FirstLogin.json';

/*
"access_token":...
"token_type": "bearer",
"id_token": "x.y.z",
"refresh_token": "a2ddee4753d24b029942cf206c86ed06-r",
"expires_in": 43199,
"jti": "083affc51c3b4daf8bcf8a473971e2c1",
"user_info": {
    "tenant_id": "08E2DD41F3B04946BCF651442E9C8E7A",
     "user_name": "SP005",
     "dist_cd": null,
     "slsman_cd": null,
     "slsman_type": null
},
"base_url": "https://accenturexyzcorp-idemo-mobile-comm-svc-extdemo.cfapps.jp10.hana.ondemand.com/api/v1.1/",
    "user_id": "demo",
    "password": "demo",
    "token_expiry_date": "2020-06-11T04:26:50.773Z"

 */


// type UserInfo = {
//     access_token: string,
//     token_type: string,/*bearer*/
//     id_token: string,
//     refresh_token: string,
//     expires_in: number, /*measured by ms*/
//     token_expiry_date: string, /*measured by ms, this is computed field*/
//     base_url: string,
//
//     user_id: string,//local user_id
//     password: string,//local
//
//     login_mode: LoginMode|"",
//
//     user_info: user_debug_info
//
// }

type user_debug_info = {
    "tenant_id": string,
    "user_name": string,
    "DIST_ID": string,
    "SLSMAN_ID": string,
    "SLSMAN_TYPE": string
}

type sso_token = {
    access_token: string,
    token_type: string,/*bearer*/
    id_token: string,
    refresh_token: string,
    expires_in: number, /*measured by ms*/
    user_info: user_debug_info
}
type UserInfo = sso_token & {
    base_url: string,
    token_expiry_date: string, /*measured by ms, this is computed field*/
    user_id: string, //local user_id
    password: string, //local
    login_mode?: LoginMode
    //prev_login_mode_checking_date?: string, /*measured by ms, this is computed field*/
}

export let gAuth = new class {
    private HttpHeader(): string {
        return "Accept:application/json;\nContent-Type:application/x-www-form-urlencoded";
    }

    UserInfoJSON: UserInfo | null = null;
    shouldLogout: boolean = false;
    private APIVersion: number = 1;
    SetAPIVersion(v: number) {
        this.APIVersion = v;
    }
    GetAPIVersion() { return this.APIVersion; }
    LoadUserInfo() {
        try {
            //Logger.Debug(`loading file ${USER_INFO_FILEPATH}`);
            //Logger.Debug(`data is  ${NativeNPSync.LoadFile(USER_INFO_FILEPATH)}`);
            this.UserInfoJSON = JSON.parse(NativeNPSync.LoadFile(USER_INFO_FILEPATH));
            if (!this.UserInfoJSON?.access_token) {
                this.UserInfoJSON = null;
                this.shouldLogout = true;
            }
            return this.UserInfoJSON;
        } catch (error) {
            this.UserInfoJSON = null;
            this.shouldLogout = true;
            return this.UserInfoJSON;
        }
    }

    SaveUserInfo() {
        NativeNPSync.WriteFile(USER_INFO_FILEPATH, JSON.stringify(this.UserInfoJSON), 'w');
    };

    GetCachedTokenInfo(): DataInToken | undefined {
        let userInfo = this.UserInfoJSON;
        if (userInfo?.user_info) {
            return {
                UserId: userInfo.user_info.user_name,
                CompanyId: userInfo.user_info.tenant_id,
                AppId: gHttpMobileManager.GetAppId(),
                DistCd: userInfo.user_info.DIST_ID,
                SlsmanCd: userInfo.user_info.SLSMAN_ID,
                SlsmanType: userInfo.user_info.SLSMAN_TYPE,
                ApiUrl: userInfo.base_url,
                AcessToken: userInfo.access_token,
                ExpiryDate: new Date(userInfo.token_expiry_date)
            };
        } else {
            return undefined;
        }
    }
    public async UpdateAccessTokenIfGettingExpiredAsync(dataToken:DataInToken, forceUpdate = false): Promise<void> {
        let renew = false;
        if (!forceUpdate) {
            //let expired = Math.random()<0.5;
            //if (dataToken.ExpiryDate < now /*|| true*/ || expired) {
            if (this.willExpireIn30Minutes(dataToken.ExpiryDate)) {
                Logger.Event("token expired, regenerate access token");
                renew = true;
            }
        } else {
            Logger.Event(`bad token, the ExpiryDate is ${dataToken.ExpiryDate.toISOString()}, regenerate access token`);
            renew = true;
        }
        if(renew){
            let accessToken = await this.RegenerateAccessTokenAsync();
            if(accessToken) {
                let newDataToken = this.GetCachedTokenInfo();
                if(newDataToken) {
                    dataToken.AcessToken = newDataToken.AcessToken;
                    dataToken.ExpiryDate = newDataToken.ExpiryDate;
                }
            }
        }
        // else{
        //     let msg = `Not expired!!!, expireDate is ${dataToken.ExpiryDate.toISOString()}, now is ${now.toISOString()}`;
        //     Logger.Error(msg);
        // }
    }
    private async InternalGetTokenInfoAsync(progress_report?: ProgressReportFunc): Promise<DataInToken | undefined> {
        await this.GetValidAccessTokenAsync(progress_report);
        let dataToken = this.GetCachedTokenInfo();
        if(!dataToken)
            Logger.Error("Missing user_info in FirstCheck.json please check oauth2/token response data ");
        return dataToken;

    }
    private async RegenerateAccessTokenAsync(): Promise<string |undefined> {
        let result = await this.RefreshTokenAsync();
        if (/*true*/!result.success) {
            // //alert("Oauth 146:"+ JSON.stringify(result));
            // if(result.error_code!==undefined){
            //     return this.UserInfoJSON?.access_token;
            // }
            // if(this.UserInfoJSON?.login_mode==="MOBILE") {
            //     this.CommLoginUI(this.UserInfoJSON?.login_mode);
            //     return this.UserInfoJSON?.access_token;
            //
            // }else {
            //     let tokenInfo = this.GetTokenInfoWithUI(make_progress_reporter());
            //     return tokenInfo?.AcessToken;
            // }
            return undefined;
        } else {
            return this.UserInfoJSON?.access_token;
        }

    }
    willExpireIn30Minutes(date:Date):boolean{
        let future = new Date();
        future.setMinutes(future.getMinutes() + 30);
        return  date < future;
    }
    /*
     *  get valid access token from saved file, if expired, will refresh token,
     *  if failed to refresh token, will prompt user/password to re-gain access token and refresh token
     *
     */
    private async GetValidAccessTokenAsync(progress_report?: ProgressReportFunc): Promise<string |undefined> {
        this.LoadUserInfo();
        if (this.UserInfoJSON !== null) {
            let expiryDate = new Date(this.UserInfoJSON.token_expiry_date);
            if (this.willExpireIn30Minutes(expiryDate) /*|| true*/) {
                let result = await gAuth.RefreshTokenAsync();
                if (!result.success) {
                    //alert("Oauth 146:"+ JSON.stringify(result));
                    if(result.error_code!==undefined){
                        //network error
                        return this.UserInfoJSON.access_token;
                    }
                    //             let baseURL = gAuth.UserInfoJSON.base_url;
                    //             if (baseURL) this.logoutUser(baseURL,null);
                    if(this.UserInfoJSON.login_mode==="MOBILE"/*|| this.UserInfoJSON.login_mode==="SSO_MOBILE"*/ ) {
                        //this.CommLoginUI(this.UserInfoJSON.login_mode, progress_report);
                        return await this.GetValidAccessTokenAsync(progress_report);

                    }else {
                        let tokenInfo = this.GetTokenInfoWithUI(progress_report);
                        return tokenInfo?.AcessToken;
                    }
                } else {
                    return this.UserInfoJSON.access_token;
                }
            } else {
                //Logger.Event("Return existing token");
                return this.UserInfoJSON.access_token;
            }
        } else {
            let tokenInfo = this.GetTokenInfoWithUI(progress_report);
            return tokenInfo?.AcessToken;
        }
    };

    //return null if user can cancel it
    //return tokenInfo obj
    async GetTokenInfoAsync(progress_report?: ProgressReportFunc): Promise<DataInToken | undefined> {
        let tokenInfo;
        this.LoadUserInfo();
        if (this.UserInfoJSON === null) {
            tokenInfo = this.GetTokenInfoWithUI(progress_report);
        } else {
            tokenInfo = await this.InternalGetTokenInfoAsync(progress_report);
        }
        return tokenInfo;
    };

    // logoutUser(baseURL: string) {
    //     let logoutUrl = baseURL + 'oauth2/logout?hardware_id=' + GetHardwareId() +
    //         '&response_type=code&redirect_uri='+REDIRECT_URI;
    //     let logoutUrlIndex = logoutUrl.search('://');
    //     Logger.Event("IDP Logout will call external url:" + logoutUrl);
    //     let strLogoutResult = ExecuteAppForResult(logoutUrl.substring(0, logoutUrlIndex), logoutUrl.substring(logoutUrlIndex + 3));
    //     Logger.Data("IDP Logout got reply:" + strLogoutResult);
    //     Logger.Event("IDP Logout end");
    //     //if (progress_report)
    //     //  progress_report({ cat: 'Authenticate', subCat: 'Logout', name: 'Redirect done', status: 'progress' });
    //     return strLogoutResult;
    // }

    async RefreshTokenAsync() {
        Logger.Event('Refresh token');
        if (!this.UserInfoJSON?.refresh_token) {
            let strError = "No refresh token";
            Logger.Event('Fail to refresh token: ' + strError);
            return {
                success: false,
                error_info: strError
            }
        }
        let refreshToken = this.UserInfoJSON?.refresh_token;
        let baseURL = this.UserInfoJSON?.base_url;

        let formValue = 'grant_type=refresh_token&redirect_uri='+REDIRECT_URI
            + '&hardware_id=' + GetHardwareId() + '&refresh_token=' + refreshToken;
        let tokenRsp = await gHttpAsync.SendWebReqAsync(baseURL + 'oauth2/token', 'POST',
            this.HttpHeader(), formValue);
        let userInfo = toJson(tokenRsp.rsp_data ?? '');
        if (tokenRsp.rsp_code === 200
            && userInfo.hasOwnProperty("expires_in")
            && userInfo.hasOwnProperty("access_token")
            && userInfo.hasOwnProperty("refresh_token")
            && userInfo.hasOwnProperty("user_info")) {

            this.UpdateUserInfo(userInfo);
            this.SaveUserInfo();
            Logger.Event('Refresh token success');
            return { success: true };
        } else {
            let str = JSON.stringify(tokenRsp);
            Logger.Event('Fail to refresh token: ' + str);
            return {
                success: false,
                error_info: str,
                error_code:tokenRsp.error_code
            };
        }
    };

     delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
     }
     async GetTokenInfoWithUI(progress_report?: ProgressReportFunc): Promise<DataInToken | undefined> {
         let defaultUrl = gHttpMobileManager.GetBaseURL('https://unza-my-qa.npa.accenture.com/mobile');
         let userId = gHttpMobileManager.GetUserId() || 'D13GT09';
         let password = gHttpMobileManager.GetUserPassword() || 'Unza@123';
         let url = defaultUrl;
         let userCredential:UserCredential = { loginMode:'MOBILE',user:userId,password:password};
         progress_report = progress_report || ((_x) => { });
         let tokenReply= await WaitForPromiseT('OAuth', 'getting jwt token',
                          this.getTokenFromServerAsync(url, userCredential, progress_report));
         if (tokenReply?.success) {
             //await CommAlert("reload", JSON.stringify(gAuth.GetCachedTokenInfo()));
             return gAuth.GetCachedTokenInfo();
         }else {
             //await WaitForPromiseT('OAuth', `error: ${tokenReply.error}`, this.delay(3000));
             return undefined;
         }
     }



    async RefreshTokenUI(baseUrl: string, refreshToken: string) {
        type RefreshTokenResult = {
            success: boolean
        };
        let finalResultX = { success: false, restart: false };

        async function onRefreshTokenPostInit(finalResult: RefreshTokenResult) {
            Logger.Event('Refresh token');
            let formValue = `grant_type=refresh_token&redirect_uri=${REDIRECT_URI}&hardware_id=${GetHardwareId()}&refresh_token=${refreshToken}`;
            let tokenRsp = await gHttpAsync.SendWebReqAsync(baseUrl + 'oauth2/token', 'POST', gAuth.HttpHeader(), formValue, undefined, 20);
            let userInfo = toJson(tokenRsp.rsp_data??"");
            if (tokenRsp.rsp_code === 200
                && userInfo.hasOwnProperty("expires_in")
                && userInfo.hasOwnProperty("access_token")
                && userInfo.hasOwnProperty("refresh_token")
                && userInfo.hasOwnProperty("user_info")) {
                gAuth.UpdateUserInfo(userInfo);
                gAuth.SaveUserInfo();
                Logger.Event('Refresh token success');
                finalResult.success = true;
            } else {
                Logger.Event(`Fail to refresh token: ${JSON.stringify(tokenRsp)}`);
                finalResult.success = false;
            }
        }
        if(!refreshToken)
           return finalResultX;
        // 2711: Authentication, 2712: Performing Server Authentication
        let title = 'IDS_HTTPCOMM_AUTH_DIALOG_TITLE';
        let desc = 'IDS_HTTPCOMM_AUTHENTICATION';
        await WaitForPromiseT(title, desc, onRefreshTokenPostInit(finalResultX));
        return finalResultX;
    }

    // async forgetPasswordAsync(baseUrl: string, user_id: string, progress_report?: ProgressReportFunc ): Promise<IHttpResponse> {
    //     progress_report = progress_report || ((_x) => { });
    //     let result: TokenFromServerResult= { success: false, error: "", needChangePassword:false };
    //     if (!baseUrl.endsWith('/'))   baseUrl += '/';
    //
    //     let data= `country_code=en-US&hardward_id=${GetHardwareId()}&user_id=${user_id}`;
    //     return await gHttpAsync.SendWebReqAsync(`${baseUrl}forgot-password`, 'POST',
    //         this.HttpHeader(), data, undefined, 20);
    // }
    // async changePasswordAsync(baseUrl: string, credential:UserCredentialUPW,
    //                               progress_report?: ProgressReportFunc ): Promise<TokenFromServerResult> {
    //     //if(credential.loginMode !== "MOBILE")
    //     //    return { success: false, error: "cannot change password, only mobile mode supports it", needChangePassword:false };
    //
    //     progress_report = progress_report || ((_x) => { });
    //     let result: TokenFromServerResult= { success: false, error: "", needChangePassword:false };
    //     if (!baseUrl.endsWith('/'))   baseUrl += '/';
    //
    //     let data= `country_code=en-US&hardward_id=${GetHardwareId()}&new_password=${credential.newPassword}&user_id=${credential.user}&password=${credential.password}`;
    //     let tokenReply= await gHttpAsync.SendWebReqAsync(`${baseUrl}change-password`, 'POST',
    //         this.HttpHeader(), data, undefined, 20);
    //     this.processTokenReply(tokenReply,result, progress_report, credential,baseUrl,true);
    //     return result;
    // }

    async getTokenFromServerAsync(baseUrl: string, credential:UserCredential,
                                  progress_report?: ProgressReportFunc,
                                  result?: TokenFromServerResult): Promise<TokenFromServerResult> {
        progress_report = progress_report || ((_x) => { });
        result = result || { success: false, error: '', needChangePassword:false };
        if (!baseUrl.endsWith('/')) baseUrl += '/';

        // if(credential.loginMode==="SSO_IDP" || credential.loginMode==="SSO_MOBILE"){
        //     //alert("SSOLogout")
        //     //SSOLogout(true,true);
        //     let ret :SSOLoginRet ;
        //     if(credential.loginMode==="SSO_MOBILE")
        //         ret =SSOLogin(48,true, credential.user, credential.password);
        //     else //SSO_IDP
        //         ret =SSOLogin(48,true);
        //     result.success = ret.result;
        //     if(result.success){
        //         let rsp = SSOGetValidToken();
        //         this.UserInfoJSON = this.CompleteUserInfo(rsp.data, baseUrl, credential.loginMode);
        //         this.SaveUserInfo();
        //         Logger.Event("Got token");
        //         progress_report({ cat: 'Authenticate', subCat: '', name: '', status: 'completed' });
        //     }else{
        //         let errorMessage = JSON.stringify(ret);
        //         Logger.Error(`Fail to get access token,  Error: ${errorMessage}`);
        //         progress_report({ cat: 'Authenticate', subCat: '', name: '', status: 'failed', detail: errorMessage });
        //         if(result.needChangePassword)
        //             result.error = '(IDS_HTTPCOMM_PASSWORD_EXPIRED)';
        //         else {
        //             // 2708: Server authentication failed. Please ensure user ID and password are correct, then try again.
        //             result.error = '(IDS_HTTPCOMM_FAIL_TO_LOGIN)';
        //         }
        //     }
        //     return result;
        // }
        let formValue =`grant_type=password&user_id=${credential.user}&password=${credential.password}`;
        formValue += `&redirect_uri=${REDIRECT_URI}&hardware_id=${GetHardwareId()}`;

        let tokenReply= await gHttpAsync.SendWebReqAsync(`${baseUrl}oauth2/token`, 'POST',
            this.HttpHeader(), formValue, undefined, 20);
        await this.processTokenReply(tokenReply,result, progress_report, credential,baseUrl,false);
        return result;

    }
    private async processTokenReply(tokenRequest:IHttpResponse,result: TokenFromServerResult,
                              progress_report: ProgressReportFunc,credential:UserCredential, baseUrl:string, bChangePassword:boolean){
        let tokenResponseData = toJson(tokenRequest.rsp_data??"");
        if (tokenRequest.rsp_code === 200
            && tokenResponseData.hasOwnProperty('access_token')
            && tokenResponseData.hasOwnProperty('refresh_token')
            && tokenResponseData.hasOwnProperty('expires_in')
            && tokenResponseData.hasOwnProperty('token_type')
            && tokenResponseData.hasOwnProperty('user_info')) {
            if(this.UserInfoJSON && this.UserInfoJSON.user_info && this.UserInfoJSON.user_info.user_name
                && this.UserInfoJSON.user_info.user_name != tokenResponseData.user_info.user_name) {
                result.success = false;
                let errorMessage='different user id is used';
                result.error = 'IDS_HTTPCOMM_DIFFERENT_USER';
                Logger.Error(`Fail to get access token,  Error: ${errorMessage}`);
                progress_report({ cat: 'Authenticate', subCat: '', name: '', status: 'failed', detail: errorMessage});
                return;
            }
            this.UserInfoJSON = this.CompleteUserInfo(tokenResponseData, baseUrl, credential.loginMode);
            //await CommAlert('userinfo',JSON.stringify(this.UserInfoJSON));
            this.SaveUserInfo();
            Logger.Event("Got token");
            progress_report({ cat: 'Authenticate', subCat: '', name: '', status: 'completed' });
            result.success = true;
            return ;
        } else {
            result.success = false;
            if (tokenRequest.error_code === NoNetwork || tokenRequest.error_code == ConnectionError) {
                // No network available. Please ensure that network connection is available and then try again.
                result.error = 'IDS_HTTPCOMM_NO_NETWORK';
            }else if (isTimeoutResponse(tokenRequest)) {
                //server did not respond
                result.error = 'IDS_HTTPCOMM_NO_RESPONSE';
            } else {
                let errorMessage;
                if (tokenResponseData.message) errorMessage = tokenResponseData.message;
                else errorMessage = JSON.stringify(tokenResponseData);
                //TODO, right now, no way to tell if it is password expired or not, have to use this error as hint to change password
                const password_expired_hint="Password reset is required";
                if(credential.loginMode === "MOBILE" && tokenRequest.rsp_code===200 && errorMessage.indexOf(password_expired_hint)!=-1){
                    result.needChangePassword = true;
                }
                Logger.Error(`Fail to get access token,  Error: ${errorMessage}`);
                progress_report({ cat: 'Authenticate', subCat: '', name: '', status: 'failed', detail: errorMessage });
                if(bChangePassword)
                    result.error = tokenResponseData.locale_message||errorMessage;
                else {
                    if(result.needChangePassword)
                        result.error = 'IDS_HTTPCOMM_PASSWORD_EXPIRED';
                    else {
                        // 2708: Server authentication failed. Please ensure user ID and password are correct, then try again.
                        result.error = 'IDS_HTTPCOMM_FAIL_TO_LOGIN';
                    }
                }
            }
            return ;
        }
    }
    private UpdateUserInfo(sso_tok: sso_token):null|string{
        let userInfo= this.UserInfoJSON;
        if(!userInfo)
            return null;
        let badExtraUserInfo = false;
        if(userInfo.user_info.tenant_id !== sso_tok.user_info.tenant_id) {
            let str = `The tenant id has been changed to ${sso_tok.user_info.tenant_id} while refreshing token`;
            Logger.Error(str);
            badExtraUserInfo = true;
            //return str;
        }
        if(userInfo.user_info.SLSMAN_ID !== sso_tok.user_info.SLSMAN_ID) {
            let str = `The SLSMAN_ID has been changed to ${sso_tok.user_info.SLSMAN_ID} while refreshing token`;
            Logger.Error(str);
            badExtraUserInfo = true;
            //return str;
        }
        if(userInfo.user_info.DIST_ID !== sso_tok.user_info.DIST_ID) {
            let str = `The DIST_ID has been changed to ${sso_tok.user_info.DIST_ID} while refreshing token`;
            Logger.Error(str);
            badExtraUserInfo = true;
            //return str;
        }
        userInfo.access_token=sso_tok.access_token;
        userInfo.token_type=sso_tok.token_type;
        userInfo.id_token= sso_tok.id_token;
        userInfo.refresh_token = sso_tok.refresh_token;
        userInfo.expires_in = sso_tok.expires_in;
        if(!badExtraUserInfo)
            userInfo.user_info = sso_tok.user_info;
        let expires_in = sso_tok.expires_in * 1000;
        if (!expires_in)
            expires_in = 24 * 60 * 60 * 1000;

        const tokenExpiryDate = new Date(new Date().getTime() + expires_in);
        userInfo.token_expiry_date = tokenExpiryDate.toISOString();
        return null;
    }
    private CompleteUserInfo(sso_tok: sso_token, baseUrl: string, loginMode:LoginMode):UserInfo {
        let userInfo= {
            access_token: sso_tok.access_token,
            token_type:sso_tok.token_type,
            id_token: sso_tok.id_token,
            refresh_token: sso_tok.refresh_token,
            expires_in: sso_tok.expires_in,
            user_info:sso_tok.user_info,

            base_url: baseUrl,
            user_id:"",
            password:"",
            login_mode:loginMode,
            token_expiry_date : ""
        };
        let expires_in = sso_tok.expires_in * 1000;
        if (!expires_in)
            expires_in = 24 * 60 * 60 * 1000;

        const tokenExpiryDate = new Date(new Date().getTime() + expires_in);
        userInfo.token_expiry_date = tokenExpiryDate.toISOString();

        return userInfo;
    }

    // getLoginModeUI(baseUrl: string): LoginModeResult {
    //     // 2711: Authentication, 2712: Performing Server Authentication
    //     let title = '(IDS_HTTPCOMM_AUTH_DIALOG_TITLE)';
    //     let desc = '(IDS_HTTPCOMM_AUTHENTICATION)';
    //     let finalResult = { success: false, error: "" };
    //     WaitForPromiseT(title, desc, this.getLoginModeAsync(baseUrl, finalResult));
    //     return finalResult;
    // }

    // async getLoginModeByPathAsync(baseUrl: string, path:string, finalResult: LoginModeResult): Promise<void> {
    //     if (!baseUrl.endsWith('/')) baseUrl += '/';
    //
    //     let endPoint = `${baseUrl}oauth2/${path}`;
    //     let fullUrl:string;
    //     if(path=="login")
    //         fullUrl=`${endPoint}?hardware_id=${GetHardwareId()}&response_type=code&redirect_uri=${REDIRECT_URI}`
    //     else
    //         fullUrl = `${endPoint}?hardware_id=${GetHardwareId()}`;
    //     Logger.Event("Inquiring login mode from "+ endPoint);
    //     let loginRequest = await gHttpAsync.SendWebReqAsync(fullUrl, 'GET',
    //         'Accept:application/json;\nCache-Control: no-cache', "", undefined, 20);
    //     if (loginRequest.rsp_code === 200) {
    //         let loginResponseData = toJson(loginRequest.rsp_data);
    //         if(path!=="get-login-mode"){
    //             if (loginResponseData.login_mode === 'MOBILE') {
    //                 Logger.Event("Successfully got login mode: MOBILE");
    //                 finalResult.success = true;
    //                 finalResult.loginMode = "MOBILE";
    //                 return ;
    //             }
    //         }
    //         else if (loginResponseData.login_mode === 'IDP' || loginResponseData.login_mode === 'MOBILE') {
    //             Logger.Event("Successfully got login mode: SSO_"+loginResponseData.login_mode);
    //             finalResult.success = true;
    //             finalResult.loginMode =loginResponseData.login_mode === 'IDP'? "SSO_IDP":"SSO_MOBILE";
    //             return;
    //         }
    //     } else if (loginRequest.rsp_code === 302 && loginRequest.rsp_header && loginRequest.rsp_header.location) {
    //         let loc = loginRequest.rsp_header.location;
    //         let loc2=loc.toLowerCase();
    //         if(loc2.startsWith("https://") || loc2.startsWith("http://")){
    //             Logger.Event("Successfully got login mode: IDP");
    //             finalResult.success = true;
    //             finalResult.loginMode = "IDP";
    //             finalResult.redirectUrl = loc;
    //             return ;
    //         }else{
    //             //bad parameter provided by engine. right now, must provide
    //             //hardware_id=aaa&response_type=code&redirect_uri=com.acnnp.htmlengine://oauth2'
    //         }
    //     }else if (loginRequest.rsp_code && loginRequest.rsp_code < 500 && loginRequest.rsp_code >= 400) {
    //         finalResult.is404 =true;
    //     }
    //     finalResult.success = false;
    //     if (loginRequest.error_code === NoNetwork || loginRequest.error_code == ConnectionError) {
    //         finalResult.isNetworkError=true;
    //         // No network available. Please ensure that network connection is available and then try again.
    //         finalResult.error = '(IDS_HTTPCOMM_NO_NETWORK)';
    //     }else if (isTimeoutResponse(loginRequest)) {
    //         finalResult.isNetworkError=true;
    //         //treat server error as network error, because inputting new user/password will not help
    //         finalResult.error = '(IDS_HTTPCOMM_NO_RESPONSE)';
    //     }else if(loginRequest.rsp_code && loginRequest.rsp_code>= 400 && loginRequest.rsp_code <500) {
    //         Logger.Error(`Received bad rsp for login mode inquiry: ${JSON.stringify(loginRequest)}`);
    //         // Bad Server url provided!
    //         finalResult.error = '(IDS_HTTPCOMM_BAD_SERVER_URL)';
    //     } else {
    //         Logger.Error(`Received unexpected login mode: ${JSON.stringify(loginRequest)}`);
    //         // System error. Please try again. If error persists, please contact Administrator.
    //         finalResult.error = '(IDS_HTTPCOMM_SYSTEM_ERROR)';
    //     }
    //     return ;
    // }
    // async getLoginModeAsync(baseUrl: string, finalResult: LoginModeResult): Promise<void> {
    //     if(false){
    //         //diable sso login api temporary
    //         await this.getLoginModeByPathAsync(baseUrl,"get-login-mode", finalResult);
    //         if(finalResult.success) {
    //             finalResult.clientId = "dontcare";
    //             //finalResult.loginMode = finalResult.loginMode;
    //             finalResult.redirectUrl = `${baseUrl}oauth2/`;
    //             return;
    //         }
    //         if(finalResult.is404){
    //             await this.getLoginModeByPathAsync(baseUrl,"login", finalResult);
    //         }
    //     }else{
    //         await this.getLoginModeByPathAsync(baseUrl,"login", finalResult);
    //     }
    // }

    ////temporary function, just for backward compatibility.
    // PromptLocalLogin(): {userId:string,password:string}{
    //     let userId:string = "";
    //     let password:string = "";
    //     ShowCustomDlg("NP_SYS_CommsLogin", async (ctrlName: string, evtType: string) => {
    //         if (evtType === "PostInit") {
    //             let dlg = NP_SYS_CommsLogin;
    //             dlg.LBL_SERVER_URL.value = '(2703)';
    //             dlg.LBL_USER_ID.value = '(2704)';
    //             dlg.LBL_PASSWORD.value = '(2705)';
    //             dlg.LBL_TITLE.value = "Please setup local user/password";//'(2706)';
    //             dlg.BBTN_LOGIN.value = "OK";// '(2706)';
    //             dlg.BBTN_CANCEL.value = "Cancel";
    //             dlg.LBL_ENG_VERSION.value = GetEngineVersion();
    //             dlg.LBL_BUNDLE_ID.value = GetEngineInfo().bundle_id ?? "";
    //
    //             dlg.LBL_ERROR.value = "";
    //
    //             dlg.EDIT_PASSWORD.SetProperty('style', 'ES_PASSWORD');
    //             dlg.EDIT_USER_ID.SetProperty("Title", '(2704)');
    //             dlg.EDIT_PASSWORD.SetProperty("Title", '(2705)');
    //
    //
    //             dlg.EDIT_USER_ID.SetVisible(true);
    //             dlg.EDIT_PASSWORD.SetVisible(true);
    //             dlg.EDIT_SERVER_URL.SetVisible(false);
    //             dlg.LBL_URL_IN_USE.SetVisible(true);
    //
    //         } else if (evtType === "Click") {
    //             if (ctrlName === "BBTN_CANCEL") {
    //                 NP_SYS_CommsLogin.Destroy();
    //             } else if (ctrlName === "BBTN_LOGIN") {
    //                 userId = NP_SYS_CommsLogin.EDIT_USER_ID.value.trim();
    //                 password = NP_SYS_CommsLogin.EDIT_PASSWORD.value.trim();
    //                 NP_SYS_CommsLogin.LBL_ERROR.value = "";
    //
    //                 if (userId === '') {
    //                     alert('(2701)');
    //                     return;
    //                 }
    //                 if (password === '') {
    //                     alert('(2702)');
    //                     return;
    //                 }
    //                 NP_SYS_CommsLogin.Destroy();
    //             }/*else if (ctrlName === "BBTN_BIO_AUTH") {
    //                 finalResult.success = BioAuthentication();
    //                 NP_SYS_CommsLogin.Destroy();
    //             }*/
    //         }
    //     }); // End of ShowCustomDlg
    //     return {userId,password}
    // }

}();
