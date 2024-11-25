import FileSystem from 'react-native-fs';
import {Alert} from 'react-native';

export const WorkDir= FileSystem.DocumentDirectoryPath ;
export const FirstCheckDir = WorkDir + '/FirstCheck';

const error_lvl =  0x01;
const warn_lvl =   0x02;
const event_lvl =  0x04;
const data_lvl =   0x08;
const debug_lvl =  0x10;

import NPLogger from '../specs/NativeNPLogger';


class NPLoggerC {
    // WriteLog(lvl:number, m:string):void {
    //     NPLogger.WriteLog(lvl, m);
    //}
    readonly Error = this.ReturnWritter(console.error, error_lvl,true);
    readonly Warn = this.ReturnWritter(console.warn, warn_lvl,true);
    readonly Event = this.ReturnWritter(console.info,event_lvl,false);
    readonly Data = this.ReturnWritter(console.log,data_lvl, false);
    readonly Debug = this.ReturnWritter(console.debug, debug_lvl, false);
    constructor(fileName:string){
        NPLogger.Close();
        NPLogger.Recreate(fileName, 0, -1);
        this.logFileName = fileName;
    }
    logFileName:string;
    private ReturnWritter(log,lvl: number, bMsgBox:boolean) {
        if(bMsgBox)
            return function (msg: any) {
                log(msg);
                let m = msg;
                if (msg instanceof Object)
                    m = JSON.stringify(msg);
                NPLogger.WriteLog(lvl, m);
                if(lvl===warn_lvl || lvl === error_lvl)
                {
                    //if (IsDevEngine()) alert(m,lvl===warn_lvl? 'DEV:Warning':'DEV:Error');
                }
            };
        else
            return function (msg: any) {
                log(msg);
                let m = msg;
                if(msg instanceof Uint8Array )
                    NPLogger.WriteLog(lvl,m);
                else  {
                    if (msg instanceof Object)
                        m = JSON.stringify(msg);
                    NPLogger.WriteLog(lvl, m);
                }
            }
    }
}
export var Logger = new NPLoggerC(`${WorkDir}/logs/.a.log`);

export function RecreateLogger(){
    NPLogger.Close();
    NPLogger.Recreate(Logger.logFileName, 0, -1);
}

export type LoginMode='MOBILE';
export interface ReportArg {
    cat: string;
    subCat: string;
    name: string;
    status?: string;
    detail?: string;
    current?: number;
    total?: number;
}
export interface NetProgressNativeArg {
    done: number;
    total: number;
    rsp_header?: any; //"HEADER_READY"
}

export interface NetProgressArg {
    current: number;
    total: number;
    status?:string;
    detail?:string;
    rsp_header?: any; //"HEADER_READY" or "RESULT_RSP"
}

export type NetProgressReportNativeFunc = (arg: NetProgressNativeArg) => void;
export type NetProgressReportFunc = (arg: NetProgressArg) => void;
export type ProgressReportFunc = (arg: ReportArg) => void;

export interface Credential {
    type:string;
    access_key_id: string;
    bucket: string;
    host: string;
    region: string;
    secret_access_key?: string;
}
export type FCStorage = {
    FLAG: string; //S
    ERR?: string
    TYPE: string ; //S3_DIRECT or "OBJECT_STORE_SVC"
    URL: string;
    CREDENTIALS:Credential;
}


export function toJson(maybeJsonString: string) {
    try {
        return JSON.parse(maybeJsonString);
    }
    catch (err) {
        return {};
    }
}

export function IsDevEngine() {
    //return GetEngineVersion().indexOf('DEV') > 0;
    return true;
}

export function countBy(xs: any[], key: string) {
    return xs.reduce(function (rv, x) {
        if (rv[x[key]] === undefined)
            rv[x[key]] = 1;
        else
            rv[x[key]] += 1;
        return rv;
    }, {});
}
//export type rowid_t = [number, number];
//export type rowids_t = [rowid_t];
type rowid_t = [number, number];
type rowids_t =rowid_t[];
//rowid should be something like [[rowid,rowidHi],[rowid,rowidHi]]
export function convertRowIdsToByteArray(rowids: rowids_t) {
    let buf = new Uint32Array(rowids.length * 2);
    for (let i = 0; i < rowids.length; i++) {
        buf[2 * i] = rowids[i][0];
        buf[2 * i + 1] = rowids[i][1];
    }
    return new Uint8Array(buf.buffer);
}


// export const error_lvl=  0x01;
// const warn_lvl=  0x02;
// const event_lvl=  0x04;
// const data_lvl=  0x08;
// const debug_lvl=  0x10;
//
//
//
// function ReturnWritter(lvl: number, bMsgBox:boolean) {
//     if(bMsgBox)
//         return function (msg: any) {
//             let m = msg;
//             if (msg instanceof Object)
//                 m = JSON.stringify(msg);
//             this.Write(lvl, m);
//             if(lvl===warn_lvl || lvl === error_lvl)
//             {
//                 if (IsDevEngine()) alert(m,lvl===warn_lvl? 'DEV:Warning':'DEV:Error');
//             }
//         };
//     else
//          return function (msg: any) {
//             let m = msg;
//             if(msg instanceof Uint8Array )
//                 this.Write(lvl,m);
//             else  {
//                 if (msg instanceof Object)
//                     m = JSON.stringify(msg);
//                 this.Write(lvl, m);
//             }
//         }
// }
// NPLogger.prototype.Error = ReturnWritter(error_lvl,true);
// NPLogger.prototype.Warn = ReturnWritter(warn_lvl,true);
// NPLogger.prototype.Event = ReturnWritter(event_lvl,false);
// NPLogger.prototype.Data = ReturnWritter(data_lvl, false);
// NPLogger.prototype.Debug = ReturnWritter(debug_lvl, false);
// export var Logger = new NPLogger('logs/HTTPComm.log');
//


export function make_progress_reporter(progress?: ProgressReportFunc):ProgressReportFunc {
    return progress?(x: ReportArg) => {
        Logger.Event(x);
        try {
            progress(x);
        } catch (exxxx) {
            if(exxxx === "NPEngine is quitting")
                Logger.Warn('Abort HttpCommSync callback: ' + exxxx);
            else
                Logger.Error('There is something wrong in HttpCommSync callback: ' + exxxx);

        }
    }:(x: ReportArg) => {
        Logger.Event(x);
    }
}
export type DataInToken={
    UserId: string;
    CompanyId: string;
    AppId: string;
    DistCd: string;
    SlsmanCd: string;
    SlsmanType: string;
    ApiUrl: string
    AcessToken: string;
    ExpiryDate: Date;
}
type TxnSepecialField={
    Name:string;
    AssembleType:"FILE"|"EMBEDDED"|string;
}
export type TxnTableDefinition={
    Name:string;
    LogicID?:string;
    Fields?: TxnSepecialField[];

}
export type TxnDefinition={
    Name: string
    ClientSchema: {
        Header: TxnTableDefinition;
        Detail: TxnTableDefinition[]
    }
}
export type TxnSector={
    "ManifestVersion": string; //"2020-03-06",
    "DocType": "TRANSACTION";
    "MaxMessageSize": string; //"10M",
    "ObjectStoreService":string;
    "StorageFuncType": string;
    "Definitions": TxnDefinition[]
}
export type TableSyncDefinition={
    "Name": string;
    Group:string;
}
export type TableSyncSector={
    "ManifestVersion": string; //"2020-03-06",
    "DocType": "SYNC";
    "MaxMessageSize": string; //"10M",
    "ObjectStoreService":string;
    "StorageFuncType": string;
    "Definitions": TableSyncDefinition[]
}
export type Manifest= {
    MANIFEST_DATE_VER: string; //"2020-03-06",
    TRANSACTION:TxnSector;
};
export type CommSector={
    MsgID: number,
    TenantID: string,
    AppID: string,
    HardwareID: string,
    EngVersion: string
    AppVersion: string,
    Type: 'SYNC'|"TRANSACTION"|string,
    Name?: string,
    CurrSyncVersion?: string,
    NewSyncVersion?: string,
    CorrelationMsgID?: string,
    RequestDT:string,
    RefreshToken:string

}
export type CommBody={
    Comm:CommSector;
    Data: {
        //TODO need to be changed later: DIST_ID ,REQUEST_DIST_ID
        DIST_ID: string,
        REQUEST_DIST_ID?: string,
        SLSMAN_ID: string,
        SLSMAN_TYPE: string //"V"
    }
};
export type TblSyncContext = {
    StartMsgID: number,
    req: CommBody,
    numAttempts: number,
    syncName: string,
    groupNames: Map<number,string>,
    dataFromToken: DataInToken;
    preserveFile: (originFile:string, seqID:number) =>string;
    getPreservedFilePath: (seqID:number) =>string;
    backupForDebug: (seqID:number) =>void;
    prevGroupName:string;
    //numByPassError:number;
    retryInterval:number;
    getRetryInterval:()=>number;
    resetRetryInterval:()=>void;
};

export type LoginModeResult = {
    success: boolean,
    error: string,
    isNetworkError?:boolean,
    loginMode?: LoginMode,
    is404?: boolean,
    redirectUrl?: string
    clientId?:string
};

// function FancyText({title, text}:{title:boolean, text?:string}) {
//     return title
//       ? <h1 className='fancy title'>{text}</h1>
//       : <h3 className='fancy cursive'>{text}</h3>
// }

// function ttt(){
//         console.log(this.props);
//
//         var items = this.props.data["items"].map(function(itemData) {
//             var component = Components[itemData['itemClass']];
//             return React.createElement(component, {
//                 data: itemData,
//                 key: itemData['id']
//             });
//         });
//         console.log(items);
//         return (
//           <div className="list">
//             <div>And I am an ItemList</div>
//         <div>{items}</div>
//         </div>
//     );
//     }
// });
export type ChangeCommPromptT = (title:string, desc:string, visible:boolean )=>void;
export let ChangeCommPrompt:ChangeCommPromptT;
export function SetCommPromptChanger(changer:ChangeCommPromptT)
{
    ChangeCommPrompt = changer;
}
export async function WaitForPromiseT<T>(title:string, desc:string , p:Promise<T>):Promise<T>
{
//     const HTML_TEMPLATE_OF_DLG =
//         `<div id='NP_SYS_WaitForPromise' class='np_msgbox' onmousedown='if (event.target === this) event.preventDefault();'
//   ontouchstart='if (event.target == this) event.preventDefault();' ontouchmove='event.preventDefault()' >
// <div id='popupBody' tabindex='0' class='np_msgbox__body'>
//   <div class='np_msgbox__body__top'>
//   <div class='np_msgbox__body__top__title'>
//     <span class='np_text np_msgbox__body__top__title__text'>
//
//     </span>
//   </div>
//   <div class='np_msgbox__body__top__separator'></div>
//   <div class='np_msgbox__body__top__content'>
//   <span class='np_text np_msgbox__body__top__content__text'>
//       <%LBL_Desc/%>
//   </span></div>
// </div>
// </div>
// </div>`;
//     const CTRLS_OF_DLG = `{
//   "LBL_Title":["label",""],
//   "LBL_Desc":["label",""]
// }`;


    //let htmlTemplate = true;
    //let retValue:(T|null)=null;
    //ShowCustomDlg('NP_SYS_WaitForPromise', CTRLS_OF_DLG, HTML_TEMPLATE_OF_DLG,
        //(ctrlName, evtType) => {
        //    if (evtType === 'PostInit' && ctrlName === 'NP_SYS_WaitForPromise') {
    ChangeCommPrompt(title,desc, true);
    let ret = await p;
    ChangeCommPrompt(title,desc, false);
    return ret;
    //p.then((value:T)=>{
    //        retValue = value;
    //        NP_SYS_WaitForPromise.Destroy()
    //});
            //}
       // }, htmlTemplate);
    //return retValue;

}
//
// export function WaitForPromise(title:string, desc:string , p:Promise<any>)
// {
//     const HTML_TEMPLATE_OF_DLG =
//         `<div id='NP_SYS_WaitForPromise' class='np_msgbox' onmousedown='if (event.target == this) event.preventDefault();'
//   ontouchstart='if (event.target == this) event.preventDefault();' ontouchmove='event.preventDefault()' >
// <div id='popupBody' tabindex='0' class='np_msgbox__body'>
//   <div class='np_msgbox__body__top'>
//   <div class='np_msgbox__body__top__title'>
//     <span class='np_text np_msgbox__body__top__title__text'>
//     <%LBL_Title/%>
//     </span>
//   </div>
//   <div class='np_msgbox__body__top__separator'></div>
//   <div class='np_msgbox__body__top__content'>
//   <span class='np_text np_msgbox__body__top__content__text'>
//       <%LBL_Desc/%>
//   </span></div>
// </div>
// </div>
// </div>`;
//     const CTRLS_OF_DLG = `{
//   "LBL_Title":["label",""],
//   "LBL_Desc":["label",""]
// }`;
//
//
//     let htmlTemplate = true;
//     let finalResult = { success: false };
//     ShowCustomDlg('NP_SYS_WaitForPromise', CTRLS_OF_DLG, HTML_TEMPLATE_OF_DLG,
//         (ctrlName, evtType) => {
//             if (evtType === 'PostInit' && ctrlName === 'NP_SYS_WaitForPromise') {
//                 NP_SYS_WaitForPromise.LBL_Title.value = title;
//                 NP_SYS_WaitForPromise.LBL_Desc.value =  desc;
//                 p.then((value:any)=>{ NP_SYS_WaitForPromise.Destroy()});
//             }
//         }, htmlTemplate);
//     return finalResult;
// }
//
// export function PromiseWithUI<T>(title:string, desc:string, p:Promise<T>):Promise<T>
// {
//     const HTML_TEMPLATE_OF_DLG =
//         `<div id='NP_SYS_WaitForPromise' class='np_msgbox' onmousedown='if (event.target == this) event.preventDefault();'
//   ontouchstart='if (event.target == this) event.preventDefault();' ontouchmove='event.preventDefault()' >
// <div id='popupBody' tabindex='0' class='np_msgbox__body'>
//   <div class='np_msgbox__body__top'>
//   <div class='np_msgbox__body__top__title'>
//     <span class='np_text np_msgbox__body__top__title__text'>
//     <%LBL_Title/%>
//     </span>
//   </div>
//   <div class='np_msgbox__body__top__separator'></div>
//   <div class='np_msgbox__body__top__content'>
//   <span class='np_text np_msgbox__body__top__content__text'>
//       <%LBL_Desc/%>
//   </span></div>
// </div>
// </div>
// </div>`;
//     const CTRLS_OF_DLG = `{
//   "LBL_Title":["label",""],
//   "LBL_Desc":["label",""]
// }`;
//
//     const  htmlTemplate = true;
//     return new Promise<T>((resolve,reject)=>{
//         ShowCustomDlg('NP_SYS_WaitForPromise', CTRLS_OF_DLG, HTML_TEMPLATE_OF_DLG,
//             (ctrlName, evtType) => {
//                 if (evtType === 'PostInit' && ctrlName === 'NP_SYS_WaitForPromise') {
//                     NP_SYS_WaitForPromise.LBL_Title.value = title;
//                     NP_SYS_WaitForPromise.LBL_Desc.value =  desc;
//                     p.then((value:any)=>{
//                         NP_SYS_WaitForPromise.Destroy();
//                         resolve(value) });
//                     p.catch(reason => {
//                         NP_SYS_WaitForPromise.Destroy();
//                         reject(reason);} );
//                 }
//             }, htmlTemplate);
//     });
//
// }

export function GetHardwareId()
{
    return "KY_TEST_111_222"
}
export function GetEngineVersion()
{
    return "0.0.1";
}
export function GetAppVersion()
{
    return "0.0.1";
}
export async function CommAlertAsync(title:string, desc:string):Promise<void> {
    return new Promise((resolve, reject) => {

        Alert.alert(
          title, desc,
          [
              {text: 'OK', onPress: () => resolve()},
          ]

        );
    });
}
