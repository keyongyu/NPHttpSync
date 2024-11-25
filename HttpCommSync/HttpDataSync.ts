import {
    CommAlertAsync,
    CommBody,
    DataInToken, FirstCheckDir, GetAppVersion, GetEngineVersion, GetHardwareId,
    IsDevEngine,
    Logger, LoginModeResult,
    Manifest,
    NetProgressReportNativeFunc,
    ProgressReportFunc,
    TblSyncContext,
    TxnDefinition,

} from './Common';
import {FirstCheckResult, gHttpMobileManager, resolve_t} from "./MobileManager";
import {gHttpAsync} from "./HttpAsync";
import {gAuth} from "./OAuth";
import {
    BINARY_FILE_FOLDER,
    FileRecD,
    gDownloadFilesManager,
    //gUploadFilesManager,
    ReducedReportArg,
    ReducedReportFunc,
} from './HttpFileSyncManager';
import NativeNPSync from '../specs/NativeNPSync.ts';
import FileSystem from 'react-native-fs';
//import {HttpCommStartUploadingTxn, HttpCommStopUploadingTxn} from "./HttpCommSyncAPI";

export type TxnUploadParam = boolean|string [];

// class BGTxnUploadingContext {
//     cb4TxnUploading: ProgressReportFunc=()=>{};
//
//     //element with value "" means all txns defined in manifest file
//     txnBatch: string[] =[];
//
//     //txn uploading retry interval
//     intervalInMsForTxnUploading :number=60000;
//
//     timerIdForBGTxnUploading :number=0;
//
//     prepareTaskForAllTxns(cb:ProgressReportFunc, intervalInMs:number ) {
//        this.cb4TxnUploading=cb;
//         this.txnBatch = [""];
//         if(intervalInMs >0 )
//             this.intervalInMsForTxnUploading = intervalInMs;
//
//         //else
//         //this.intervalInMsForTxnUploading= 60000;
//     }
//     cleanTimerId(){
//         this.timerIdForBGTxnUploading = 0;
//     }
//     hasPendingTasks(){
//         return this.txnBatch.length>0;
//     }
//     // appendTask(txnNames:string){
//     //     this.txnBatch.push(txnNames);
//     // }
//     consolidateTxnTasks():void{
//         //this.txnBatch will be something like ["", "txn_tbl1|txn_tbl2", "txn_tbl1|txn_tbl2"]
//         if(!this.hasPendingTasks())
//             return;
//         if(this.txnBatch.indexOf("")>=0){
//             //"" means all txns defined in manifest file,
//             //any "" in the batch list will collapse the whole txn batch task,
//             //    and discard the other pending txn uploading task
//             Logger.Event(`${this.txnBatch.length} tasks have been consolidated into single and full txn uploading task` );
//             this.txnBatch=[""];
//         }else{
//             //I don't want to produce an array with one long string element like
//             //["txn_tbl1|txn_tbl2|txn_tbl1|txn_tbl2|txn_tbl1"]
//             //instead, I want to distincted string like ["tbl1|tbl2|tbl3"]
//             //this.txnBatch= [this.txnBatch.join('|')];
//             let tblSet= new Set(this.txnBatch.join('|').split("|"));
//             let allTxnTblNames = [... tblSet].join('|');
//             Logger.Event(`${this.txnBatch.length} tasks have been consolidated, the txn name is ${allTxnTblNames}` );
//             this.txnBatch = [allTxnTblNames];
//         }
//     }
//     //return null for all
//     getTopTxnTask():(string[]|null){
//         return  this.txnBatch[0]===""? null:this.txnBatch[0].split('|');
//     }
//     discardTopTxnTask(){
//         if(this.txnBatch.length>0)
//             this.txnBatch.pop();
//     }
//     stopTimer(){
//         if(this.timerIdForBGTxnUploading!=0) {
//             ClearTimeout(this.timerIdForBGTxnUploading);
//             this.timerIdForBGTxnUploading = 0;
//         }
//     }
//
// }

const TblSyncVersionFile = `${FirstCheckDir}/FirstCheck/TblSyncVersion.json`;
const LastTxnSubmittedTimeStampFile =  `${FirstCheckDir}/FirstCheck/LastTxnSubmittedTimeStamp.json`;
//const MaxNumRetries = 5;
let MaxNumRetries = 5;
let bSyncDataGoingOn = false;
let bSyncStopRequested = false;
// let bUploadingTxn= false;
// let bAutoUploadTxn = false;
let tempFolderNames = new Set<string>();
function ISOString() {
    return new Date().toISOString();
}
function getErrMsgIfUserRequestToHalt() {
    if(bSyncDataGoingOn && bSyncStopRequested)
        return "HttpCommSync is halted due to invocation of HttpCommSyncStop";
}
function throwExceptionIfUserRequestToHalt() {
    if(bSyncDataGoingOn && bSyncStopRequested)
        throw "HttpCommSync is halted due to invocation of HttpCommSyncStop";
}

function GetLatestSyncVersion(syncName:string) {
    try {
        let tblSyncVersions = JSON.parse(NativeNPSync.LoadFile(TblSyncVersionFile));
        let syncVersion = tblSyncVersions[syncName];
        return !syncVersion ? '' : syncVersion;
    } catch (e) {
        return '';
    }
}
function SetLatestSyncVersion(syncName:string, tblSyncVersion:string) {
    let tblSyncVersions:any = {};
    try {
        tblSyncVersions = JSON.parse(NativeNPSync.LoadFile(TblSyncVersionFile));
        tblSyncVersions[syncName] = tblSyncVersion;
    } catch (e) {
        tblSyncVersions = {};
        tblSyncVersions[syncName] = tblSyncVersion;
    }
    NativeNPSync.WriteFile(TblSyncVersionFile, JSON.stringify(tblSyncVersions), 'w');
}

function GetLastSubmittedTimeStamp() {
    try {
        let s = NativeNPSync.LoadFile(LastTxnSubmittedTimeStampFile);
        //2020-06-10T16:31:10.377Z
        let b = s.split(/\D+/);
        return new Date(Date.UTC(+b[0], +b[1] - 1, +b[2], +b[3], +b[4], +b[5],+b[6]));
    } catch (e) {
        return null;
    }
}

function RecordLastSubmittedTimeStamp() {
    return NativeNPSync.WriteFile(LastTxnSubmittedTimeStampFile, new Date().toISOString(), 'w');
}

export function GetHttpTmpFolder() {
    return FileSystem.TemporaryDirectoryPath;
}

async function TableSyncAsync(dataFromToken:DataInToken, manifestObj:any,
                              progress:ProgressReportFunc, syncName:string, distCd:string) {
    progress({ cat: 'TblSync', subCat: syncName, name: '', status: 'start' });
    let tblsync_def = manifestObj ? manifestObj[syncName] : null;
    if (!tblsync_def) {
        let error = 'Error: No table sync definition for \'' + syncName + '\'';
        Logger.Error(error);
        progress({ cat: 'TblSync', subCat: syncName, name: '', status: 'failed', detail: error });
        return { success: false, error: error };
    }
    let syncVersion = GetLatestSyncVersion(syncName);
    let msgId = Math.ceil(Math.random() * 65536 + 1);
    let body : CommBody= {
        Comm: {
            MsgID: msgId,
            TenantID: dataFromToken.CompanyId,
            AppID: dataFromToken.AppId,
            HardwareID: GetHardwareId(),
            EngVersion: GetEngineVersion(),
            AppVersion: GetAppVersion(),
            Type: 'SYNC',
            Name: syncName,
            CurrSyncVersion: syncVersion,
            NewSyncVersion: '',
            CorrelationMsgID: '',
            RequestDT:"",
            RefreshToken:gAuth.UserInfoJSON?.refresh_token||""

        },
        Data: {
            DIST_ID: dataFromToken.DistCd,
            REQUEST_DIST_ID: distCd??"",
            SLSMAN_ID: dataFromToken.SlsmanCd,
            SLSMAN_TYPE: dataFromToken.SlsmanType //"V"
        }
    };
    let emptyMap =new Map<number,string>();
    let tblSyncContext :TblSyncContext= {
        StartMsgID: msgId,
        prevGroupName:"",
        req: body, numAttempts: 0,
        syncName: syncName,
        groupNames:emptyMap,
        'dataFromToken': dataFromToken,
        preserveFile: function (originFile:string, seqID:number) {
            let destFile = this.getPreservedFilePath(seqID);
            NativeNPSync.MoveFile(originFile, destFile);
            return destFile;
        },
        getPreservedFilePath: function (seqID:number) {
            return GetHttpTmpFolder() + '/result_' + seqID.toString() + '.json';
        },
        //getBackupFilePath: function (seqID) {
        //    return __GetHttpTmpFolder() + '/backup_' + seqID + '.json';
        //},
        backupForDebug: function (seqID:number) {
            //need'nt backup file, just let it be alias of "DeleteFile"

            //let destFile = this.getBackupFilePath(seqID);
            //let srcFile = this.getPreservedFilePath(seqID);
            //MoveFile(srcFile, destFile);
            //return destFile;
            let srcFile = this.getPreservedFilePath(seqID);
            NativeNPSync.DeleteFile(srcFile);
        },
        retryInterval:5,
        resetRetryInterval:function(){ this.retryInterval = 5;},
        getRetryInterval:function(){
            let p= this.retryInterval;
            this.retryInterval*=2;
            if(this.retryInterval>=30)
                this.retryInterval=30;
            return p;
        },
        //numByPassError:0

    };
    // Clear all files before starting table sync
    NativeNPSync.DeleteFileAll(GetHttpTmpFolder(), 'result_*.json');
    NativeNPSync.DeleteFileAll(GetHttpTmpFolder(), '__http_request*');

    let ret = await TableSyncAsyncImpl(tblSyncContext, progress); // Download data and files
    if (ret.success)
        progress({ cat: 'TblSync', subCat: syncName, name: '', status: 'progress', detail: 'download done' });
    else {
        DiscardTableSync(tblSyncContext, progress);
        gDownloadFilesManager.cleanup();
        progress({ cat: 'TblSync', subCat: syncName, name: '', status: 'failed', detail: ret.error });
        return ret;
    }

    // Ensure all downloads are completed
    if(!bSyncStopRequested)
        await gDownloadFilesManager.waitAllFilesDownloaded();
    if(gDownloadFilesManager.downloadTracker.size>0){
        Logger.Event('Finish downloading table sync files.');
        for (const [table, tracker] of gDownloadFilesManager.downloadTracker) {
            if (tracker.total > 0) {
                let failCount = tracker.total - tracker.successDownloads.length
                Logger.Event(`Table: ${table}, Success: ${tracker.successDownloads.length}, Failed: ${failCount}`);
            }
        }
    }
    // if(/*tblSyncContext.numByPassError!==0 &&*/ __CommGetBlackList().indexOf(syncName)!==-1 ) {
    //     //alert("num of bypass = "+tblSyncContext.numByPassError);
    //     ret = { success:false, error:`Discard all data due to rollback blacklist:${__CommGetBlackList()}`};
    // }
    // else
    {
        let err = getErrMsgIfUserRequestToHalt();
        if(!err)
            ret = await ProcessTableSyncAsync(tblSyncContext, progress); // Updating database records
        else
            ret = { success:false, error:err };
    }

    if (ret.success)
        progress({ cat: 'TblSync', subCat: syncName, name: '', status: 'completed', detail: 'processing done' });
    else {
        DiscardTableSync(tblSyncContext, progress);
        progress({ cat: 'TblSync', subCat: syncName, name: '', status: 'failed', detail: ret.error });
    }

    gDownloadFilesManager.cleanup();
    return ret;
}
type SuccessOrErrorDesc = {success:boolean, error?:string};

function ExistFolder(table: string) {
    return NativeNPSync.Exists(`${BINARY_FILE_FOLDER}/${table}`);
}
function MoveFolder(src: string, dst:string) {
    return NativeNPSync.MoveFile(`${BINARY_FILE_FOLDER}/${src}`, `${BINARY_FILE_FOLDER}/${dst}`);
}

function DeleteFolder(folder: string) {

    return NativeNPSync.DeleteFolder(`${BINARY_FILE_FOLDER}/${folder}`);
}
function ExistAbsFile(file: string) {
    return NativeNPSync.Exists(file);
}
function DeleteAbsFile(file: string) {
    NativeNPSync.DeleteFile(file);
}

async function TableSyncAsyncImpl(tblSyncContext:TblSyncContext, progress:ProgressReportFunc, resolve?:resolve_t): Promise<SuccessOrErrorDesc>
{
    //Logger.Event("TableSyncAsyncImpl: "+ JSON.stringify(tblSyncContext.req))
    let retry = false;
    let resolveResult = { success: false, error: 'unknown' };
    tempFolderNames = new Set<string>();

    try {
        for (; ;) {
            throwExceptionIfUserRequestToHalt();
            let groupName = '';
            let lastGroupMsg = false;
            let totalLength = -1;
            tblSyncContext.req.Comm.RequestDT = ISOString();
            let stringBody = JSON.stringify(tblSyncContext.req);
            Logger.Event(`Sending TableSync request, MsgId=${tblSyncContext.req.Comm.MsgID}`);
            let response = await DownloadTableAsync(stringBody,
                (status) => {
                    if (!status.rsp_header) {
                        if (groupName !== "") {
                            progress({
                                cat: 'TblSync', subCat: tblSyncContext.syncName, name: groupName, status: 'progress', detail: 'downloading tables',
                                current: status.done,
                                total: totalLength
                            });
                        }
                    }
                    else {
                        if (status.rsp_header.hasOwnProperty('group-name'))
                            groupName = status.rsp_header['group-name'];
                        if (status.rsp_header.hasOwnProperty('msg-length'))
                            totalLength = status.rsp_header['msg-length'];
                        if (status.rsp_header.hasOwnProperty('group-lastmsg'))
                            lastGroupMsg = status.rsp_header['group-lastmsg'] === 'Y';
                        else
                            lastGroupMsg = true;
                        if (groupName !== tblSyncContext.prevGroupName) {
                            //if(prevGroupName!==''){
                            //  progress({ cat: 'TblSync', subCat: tblSyncContext.syncName, name: prevGroupName, status: 'completed'});
                            //}
                            if (groupName !== '')
                                progress({ cat: 'TblSync', subCat: tblSyncContext.syncName, name: groupName, status: 'start', detail: 'downloading tables' });
                            tblSyncContext.prevGroupName = groupName;
                        }
                    }
                },
                tblSyncContext.dataFromToken);

            Logger.Event(`Get response of tblsync request, MsgId:${tblSyncContext.req.Comm.MsgID}`);
            let file = response.rsp_data;
            if (response.rsp_code !== 200) {
                let error = '';
                if (response.error_desc) {
                    error = 'Error: ' + response.error_desc;
                } else {
                    let fileData = gHttpAsync.GetFileContent(response);
                    error = 'Error: ' + response.rsp_code + ', data: ' + fileData;
                }
                tblSyncContext.numAttempts += 1;
                retry =((response.rsp_code??0) < 500) && tblSyncContext.numAttempts < MaxNumRetries;
                NativeNPSync.DeleteFile(file!);
                if (retry) {
                    let retryInterval= tblSyncContext.getRetryInterval();
                    Logger.Warn(`Received bad rsp of tblsync,${error}, will retry it after ${retryInterval} sec.`);
                    throw retryInterval;
                } else {
                    //Logger.Error("Received too much bad rsp of tblsync:" + error + ", will abort");
                    throw error;
                }
            }
            else
                tblSyncContext.resetRetryInterval();
            let str_comm_rsp = NativeNPSync.Comm2ProcessTblSync(file!, true);
            let comm_rsp = str_comm_rsp === "" ? null : JSON.parse(str_comm_rsp);
            if (!comm_rsp) {
                retry = false;
                throw 'Bad format received in tablesync data: ' + gHttpAsync.GetFileContent(response);
            }

            // Download Files
            // check if ${Table} folder exists
            // if exists rename it to ${Table}__temp
            // new file will be downloaded to ${Table} folder
            // thus, ${Table} folder will always contain only those valid files
            // on error, ${Table}__temp will be renamed back to ${Table}
            // on success, delete ${Table}__temp
            let fileRecords = comm_rsp.FileRecords as  { [key: string]:FileRecD[] }
            let progressLogger:ReducedReportFunc = (x:ReducedReportArg) => {
                let newObj = Object.assign({ cat: 'TblSync', subCat: tblSyncContext.syncName, name: groupName, detail: 'downloading files' }, x);
                progress(newObj);
            };
            gDownloadFilesManager.init(progressLogger, tblSyncContext.dataFromToken);

            if (fileRecords) {
                for(let [table, fileRequests] of Object.entries(fileRecords)){
                    // check if ${Table} folder exists
                    if (ExistFolder(table)) {
                        DeleteFolder(`${table}__temp`);
                    }

                    if (!fileRequests || !Array.isArray(fileRequests)) continue;
                    tempFolderNames.add(`${table}__temp`);
                    await gDownloadFilesManager.appendFileDownloadingTasksAsync(table, fileRequests);
                }
                gDownloadFilesManager.startDownloadTasks();
            }

            tblSyncContext.preserveFile(file!, tblSyncContext.req.Comm.MsgID);
            tblSyncContext.groupNames.set(tblSyncContext.req.Comm.MsgID, groupName) ;
            tblSyncContext.req.Comm.MsgID += 1;

            let corMsgId = comm_rsp.Comm.MsgID;
            let version = comm_rsp.Comm.NewSyncVersion;
            let reply = comm_rsp.Response;

            //either payload or response
            if (reply) { // response here
                // Server busy, try again later
                if (reply.Status === 'OK' || (reply.Status === "FAIL" && reply.Detail === "Reach maximum of connections")) {
                                             //Don't know what is better way to detect server reaches maximum of connections
                    throwExceptionIfUserRequestToHalt();
                    retry = true;
                    //throw 5;
                    throw tblSyncContext.getRetryInterval();
                } else if (reply.Status === 'COMPLETE' /*|| reply.Status === 'FAIL'*/) {
                    if (resolve)
                        resolve({ success: true });
                    return { success: true };
                } else if (reply.Status === 'BYPASS' && corMsgId !== -1) {
                    //BYPASS is not returned from server, it is returned from engine,
                    //intend to tell httpcomm module to by pass the FAIL reply
                    let ret = { success: false, error: 'Server reject:' + JSON.stringify(reply) };
                    Logger.Error(ret.error);
                    progress({
                        cat: 'TblSync', subCat: tblSyncContext.syncName, name: '',
                        status: 'progress', detail: 'bypass response: ' + JSON.stringify(reply)
                    });

                    //tblSyncContext.numByPassError +=1;
                    //tblSyncContext.numAttempts += 1;
                    tblSyncContext.req.Comm.CorrelationMsgID = corMsgId;
                    tblSyncContext.req.Comm.NewSyncVersion = version;
                } else if (reply.Status === 'FAIL' || (reply.Status === 'BYPASS' && corMsgId === -1)) {
                    //MsgId:-1 means it is fatal error, have to abort, should not by pass
                    let ret = { success: false, error: 'Server rejected:' + JSON.stringify(reply) };
                    Logger.Error(ret.error);
                    if (resolve)
                        resolve(ret);
                    return ret;
                } else {
                    throwExceptionIfUserRequestToHalt();

                    let error = 'Encounted unexpected response of tblsync:' + JSON.stringify(reply);
                    Logger.Error(error);
                    //temporary test, see if will retry after 1 sec,
                    tblSyncContext.numAttempts += 1;
                    retry = tblSyncContext.numAttempts < MaxNumRetries;
                    //              retry = true;
                    throw 1;
                }
            } else {
                //payload here
                if (lastGroupMsg)
                    progress({ cat: 'TblSync', subCat: tblSyncContext.syncName, name: groupName, status: 'completed' });
                // Prepare data for next round
                tblSyncContext.req.Comm.CorrelationMsgID = corMsgId;
                tblSyncContext.req.Comm.NewSyncVersion = version;
            }
        }
    } catch (error) {
        if (retry && (typeof error) === 'number' && tblSyncContext.numAttempts < MaxNumRetries) {
            Logger.Event(`Will re-download tablesync:${tblSyncContext.syncName} in ${error} seconds`);
            resolveResult = await new Promise((resolve2) => {
                setTimeout(() => {
                    TableSyncAsyncImpl(tblSyncContext, progress, resolve2);
                }, error * 1000);
            });

        } else {
            if ((typeof error) === 'number' && tblSyncContext.numAttempts >= MaxNumRetries) {
                let errmsg = 'Failed to download tblsync after ' + tblSyncContext.numAttempts + ' attempts';
                Logger.Error(errmsg);
                resolveResult = { success: false, error: errmsg };
            } else {
                if(bSyncStopRequested)
                    Logger.Event(error);
                else
                    Logger.Error('Encounter tblsync error:' + JSON.stringify(error));
                resolveResult = { success: false, error: error };
            }
        }
    }
    if (resolve)
        resolve(resolveResult);
    return resolveResult;
}

async function DownloadTableAsync(stringBody:string, progress:NetProgressReportNativeFunc, dataFromToken:DataInToken) {
    let url = gHttpMobileManager.CommServiceURL() + 'sync-request';
    //let header = await gHttpMobileManager.HttpHeader(dataFromToken.AcessToken);
    return await gHttpAsync.DownloadFileWithTokenAsync(url, 'POST', dataFromToken, stringBody, progress);
}


function DiscardTableSync(tblSyncContext:TblSyncContext, progress:ProgressReportFunc) {
    let sequenceID = tblSyncContext.StartMsgID;
    let success = false;
    for (; ;) {
        let groupName = tblSyncContext.groupNames.get(sequenceID)??"";
        let file = tblSyncContext.getPreservedFilePath(sequenceID);
        if(!ExistAbsFile(file))
            break;
        progress({
            cat: 'TblSync', subCat: tblSyncContext.syncName,
            name: groupName, status: 'progress', detail: 'processing'
        });
        DeleteAbsFile(file);
        sequenceID++;
    }
    tempFolderNames.forEach((folderName:string) => {
        let table = folderName;
        if (ExistFolder(table)) DeleteFolder(table);
    });

    return {success};

}



async function ProcessTableSyncAsync(tblSyncContext:TblSyncContext, progress:ProgressReportFunc) {
    try {
        let sequenceID = tblSyncContext.StartMsgID;
        let success = false;
        NativeNPSync.SQLBeginTransaction();
        for (; ;) {
            let groupName = tblSyncContext.groupNames.get(sequenceID)??"";
            progress({
                cat: 'TblSync', subCat: tblSyncContext.syncName,
                name: groupName, status: 'progress', detail: 'processing'
            });
            let file = tblSyncContext.getPreservedFilePath(sequenceID);
            let comm_rsp_str = NativeNPSync.Comm2ProcessTblSync(file, false);
            if (!comm_rsp_str) {
                //something wrong, need to backup the received data
                tblSyncContext.backupForDebug(sequenceID);
                progress({
                    cat: 'TblSync', subCat: tblSyncContext.syncName, name: groupName,
                    status: 'failed', detail: 'Can\'t process tablesync data'
                });
                break;
            }
            let comm_rsp = JSON.parse(comm_rsp_str);
            //dev engine will continue to process the rest tablesyncs
            //so, it should not be "", which means fatal error,
            //instead, it will return an rsp object with error message
            //hence, here need to handle Error message,
            if (comm_rsp.Error) {
                //dev engine should not block tablesync even if error exists,
                //just prompt user something wrong
                tblSyncContext.backupForDebug(sequenceID);
                if (IsDevEngine()) await CommAlertAsync('Error',comm_rsp.Error);
            }
            else {
                DeleteAbsFile(file);
            }

            let version = comm_rsp.Comm.NewSyncVersion;
            let reply = comm_rsp.Response;
            sequenceID++;

            if (reply) {
                if (reply.Status === 'COMPLETE') {
                    // delete original folder when all sync requests completed
                    // rename temp folder as original folder
                    tempFolderNames.forEach((folderName:string) => {
                        let table = folderName.split('__')[0];
                        if (ExistFolder(table)) DeleteFolder(table);
                        let temp= `${table}__temp`;
                        if (ExistFolder(temp))
                            MoveFolder(temp, table);
                    });

                    SetLatestSyncVersion(tblSyncContext.syncName, version);
                    success = true;
                    break;
                }
            }
        }
        // if(gAuth.GetAPIVersion()===1)
        //     //for (const [table, tracker] of Object.entries(gDownloadFilesManager.downloadTracker)) {
        //     gDownloadFilesManager.downloadTracker.forEach((tracker,__table,__map)=>{
        //         tracker.successDownloads.forEach((successDownload) => {
        //             if(!successDownload.COLUMN_NAME)
        //                 return;
        //             let sql = `update ${successDownload.table} set ${successDownload.COLUMN_NAME} = ? where ${successDownload.COLUMN_NAME} = ?`;
        //             let paramOne = successDownload.FILE_NAME;
        //             let paramTwo = successDownload.ID;
        //             SQLExecute(sql, paramOne, paramTwo);
        //         });
        //     });

        NativeNPSync.SQLCommit(success);
        return { success };
    } catch (error) {
        progress({ cat: 'TblSync', subCat: tblSyncContext.syncName, name: '', status: 'failed', detail: ''+error });
        NativeNPSync.SQLCommit(false);
        return { success: false };
    }
}

export let gHttpDataSync = new class {
    // async UploadAllTxnsAsync (arrTxnNames:string[]|null,numAttempts:number, dataFromToken:DataInToken, manifest:Manifest,
    //                           progress:ProgressReportFunc, resolve?:resolve_t) :Promise<SuccessOrErrorDesc>{
    //     let resolveResult:SuccessOrErrorDesc = { success: true };
    //
    //     if (!manifest.TRANSACTION) {
    //         if (resolve) resolve(resolveResult);
    //         return resolveResult;
    //     }
    //     let txn_blk :TxnBulk|null = null;
    //     let txn_def:TxnDefinition|null =null;
    //     try {
    //         gUploadFilesManager.init(progress, dataFromToken, manifest);
    //         let max_msg_size = 1024 * 1024;
    //         if (manifest.TRANSACTION.MaxMessageSize) {
    //             max_msg_size = parseInt(manifest.TRANSACTION.MaxMessageSize);
    //
    //             if (manifest.TRANSACTION.MaxMessageSize.indexOf('M') > 0) {
    //                 max_msg_size *= 1024 * 1024;
    //             } else if (manifest.TRANSACTION.MaxMessageSize.indexOf('K') > 0) {
    //                 max_msg_size *= 1024;
    //             }
    //         }
    //         let txn_defs = manifest.TRANSACTION.Definitions;
    //
    //         for (txn_def of txn_defs) {
    //             let client_schema = txn_def.ClientSchema;
    //             let txnName = txn_def.Name;
    //
    //             if (!client_schema || !txnName || txnName.substr(-5) === '#FILE')
    //                 continue;
    //             //null or empty array mean to upload all txns
    //             if(arrTxnNames && arrTxnNames.length>=0 && arrTxnNames.indexOf(txnName)<0)
    //                 continue;
    //
    //             let txnBlkUploadFiles:FileRecU[] = [];
    //             //will be null, or object like {hasError:true, errorMsg:"", arrayFiles};
    //             let hangingTxn = __Comm2GetTxnHangingFiles(txn_def.Name, JSON.stringify(client_schema));
    //             if (hangingTxn && hangingTxn.hasError) {
    //                 //let err=hangingTxn.errorMsg;
    //                 let err = `Fail to compose txn(${txnName}), ${hangingTxn.errorMsg}`;
    //                 Logger.Warn(err);
    //                 //if (IsDevEngine()) alert(err, 'Warning');
    //                 continue;
    //             }
    //             if (hangingTxn) txnBlkUploadFiles = hangingTxn.arrayFiles || [];
    //             if (txnBlkUploadFiles.length > 0) {
    //                 Logger.Debug(`get hanging ${txnBlkUploadFiles.length} files for txn(${txnName})`);
    //             }
    //             for (; ;) {
    //                 //null, {hasError:true, errorMsg:""} or {hasNext:true/false, byteArray:,msgID:555, rowIDs: }
    //                 txn_blk = __Comm2MakeTxn(dataFromToken.CompanyId, dataFromToken.AppId,gAuth.UserInfoJSON?.refresh_token||"",
    //                     max_msg_size, txnName, JSON.stringify(client_schema));
    //
    //                 if (txn_blk && txn_blk.hasError) {
    //                     let err = `Fail to compose txn(${txnName}), ${txn_blk.errorMsg}`;
    //                     Logger.Warn(err);
    //                     txnBlkUploadFiles = [];
    //                     break;
    //                 }
    //
    //                 if (txn_blk && txn_blk.byteArray && txn_blk.byteArray.byteLength > 0) {
    //                     Logger.Event('Composed transaction (' + txn_def.Name + '), MsgId=' + txn_blk.msgID + ', length=' + txn_blk.byteArray.byteLength);
    //
    //                     progress({ cat: 'UploadTxn', subCat: 'Data', name: txn_def.Name, status: 'start' });
    //                     //WriteFile("txn_payload.txt", txn_blk.byteArray);
    //                     //alert("txn_payload.txt");
    //                     let uploadRequest = await gHttpDataSync.UploadTxnAsync(txn_blk.byteArray, (status) => {
    //                         progress({ cat: 'UploadTxn', subCat: 'Data', name: txnName, status: 'progress', current: status.done, total: status.total });
    //                     }, dataFromToken);
    //                     if (/*uploadRequest.type != "RESULT_RSP" &&*/ uploadRequest.rsp_code !== 200) {
    //                         Logger.Error('tried to upload txn(' + txn_def.Name + '), MsgId=' + txn_blk.msgID + ', length=' + txn_blk.byteArray.byteLength + ', but got error_desc=' + uploadRequest.error_desc);
    //                         numAttempts++;
    //                         throw 2;
    //                     }
    //
    //                     let rsp_data = JSON.parse(uploadRequest.rsp_data);
    //                     if (rsp_data.Response && rsp_data.Response.Status !== 'OK') {
    //                         let error = '';
    //                         if (rsp_data.Response.FailReason)
    //                             error = `Server reject txn(${txn_def.Name}), MsgId=${txn_blk.msgID} with ${rsp_data.Response.Status}:${rsp_data.Response.FailReason}`;
    //                         else
    //                             error = `Server reject txn(${txn_def.Name}), MsgId=${txn_blk.msgID} with ${rsp_data.Response.Status}`;
    //                         throw error;
    //                         //set hasNext to true to skip the file uploading
    //                         //txn_blk.hasNext = true;
    //                         //break;
    //
    //                     } else if (rsp_data.Response.hasOwnProperty("Status") && rsp_data.Response.hasOwnProperty("Detail")) {
    //                         let status = rsp_data.Response.Status;
    //                         let detail = rsp_data.Response.Detail;
    //                         if (status === "FAIL" && detail === "Reach maximum of connections") {
    //                             numAttempts++;
    //                             throw 5;
    //                         }
    //                     } else if (rsp_data.Comm.CorrelationMsgID === txn_blk.msgID) {
    //                         Logger.Event('Uploaded transaction (' + txn_def.Name + '), MsgId='
    //                             + txn_blk.msgID + ', length=' + txn_blk.byteArray.byteLength);
    //                         txn_blk.byteArray = null;
    //                         txn_blk.bufferPtr = null;
    //                         let totalTxnRows = 0;
    //                         if(txn_blk.rowIDs)
    //                             totalTxnRows= txn_blk.rowIDs.byteLength / 8;
    //                         // update COMM_STATUS to T or S accordingly
    //                         let commStatus = (txnBlkUploadFiles && txnBlkUploadFiles.length > 0) ? 'T' : 'S';
    //                         __Comm2CommitTxn(txn_def.Name, client_schema.Header.Name, txn_blk, commStatus);
    //                         let progressDetail = `${totalTxnRows} Txn status set to ${commStatus}.`;
    //                         progress({
    //                             cat: 'UploadTxn', subCat: 'Data', name: txn_def.Name, status: 'completed',
    //                             detail: progressDetail, total: totalTxnRows
    //                         });
    //                         Logger.Event('Transaction committed (' + txn_def.Name + '), MsgId=' + txn_blk.msgID);
    //                     } else {
    //                         Logger.Error('Received unmatched MsgId');
    //                     }
    //                 }
    //
    //                 if (txn_blk && txn_blk.hasNext) {
    //                     continue;
    //                 }
    //                 break;
    //             }
    //             if (txnBlkUploadFiles.length > 0 && (!txn_blk || !txn_blk.hasNext)) {
    //                 gUploadFilesManager.appendTxnUploadingTasks(
    //                     manifest.TRANSACTION.ObjectStoreService,
    //                     txnBlkUploadFiles, txn_def);
    //             }
    //             txnBlkUploadFiles = [];
    //
    //         }
    //         await gUploadFilesManager.uploadAllFilesAsync();
    //     } catch (error) {
    //         if (txn_blk !== null && txn_def !== null && (typeof error) !== 'number') {
    //             //var err_msg = "Upload transaction failed " + JSON.stringify(error);
    //             let err_msg = 'Upload transaction (' + txn_def.Name + '), MsgId=' + txn_blk.msgID + ', error: ' + JSON.stringify(error);
    //             Logger.Error(err_msg);
    //             progress({ cat: 'UploadTxn', subCat: '', name: txn_def.Name, status: 'failed', detail: err_msg });
    //
    //         } else if ((typeof error) === 'number' && numAttempts < MaxNumRetries) {
    //             //progress({ cat: 'UploadTxn', subCat: '', name: txn_def.Name, status: 'progress', detail: 'Error: retrying in ' + error + ' seconds' });
    //             if(txn_def)
    //                 Logger.Event(`Will re-upload txn:${txn_def.Name} in ${error} seconds`);
    //             resolveResult = await new Promise((resolve2) => {
    //                 SetTimeout(() => {
    //                     this.UploadAllTxnsAsync(arrTxnNames, numAttempts, dataFromToken, manifest, progress, resolve2);
    //                 }, error * 1000);
    //             });
    //         } else {
    //             if ((typeof error) === 'number' && numAttempts >= MaxNumRetries) {
    //                 let errmsg = 'Failed to upload transaction after ' + numAttempts + ' attempts';
    //                 Logger.Error(errmsg);
    //                 resolveResult = { success: false, error: errmsg };
    //             } else {
    //                 Logger.Error('Encounter upload transaction error:' + error);
    //                 resolveResult = { success: false, error: error };
    //             }
    //         }
    //     }
    //     if (txn_blk) txn_blk.byteArray = null;
    //     gUploadFilesManager.cleanup();
    //     if (resolve) resolve(resolveResult);
    //
    //     return resolveResult;
    // };
    //
    // async UploadTxnAsync(arrayBuffer:Uint8Array|string, progress:NetProgressReportNativeFunc, dataInToken:DataInToken) {
    //     let url = gHttpMobileManager.CommServiceURL() + 'transaction';
    //     //let header = await gHttpMobileManager.HttpHeader(token);
    //     return await gHttpAsync.SendWebReqWithTokenAsync(url, 'POST', dataInToken, arrayBuffer, progress);
    // };

    // async SyncDataAsync2(progress: ProgressReportFunc, syncNames: string[], firstCheck: boolean,
    //                      distCd:string, txnUpload:TxnUploadParam):Promise<SuccessOrErrorDesc>{
    //     if (bSyncDataGoingOn) {
    //         if ((syncNames === null || syncNames.length == 0) && txnUpload != false) {
    //             let smartTxnEnabled = HttpCommStopUploadingTxn();
    //             let ret = await gHttpDataSync.UploadAllTxnsNowAsyncFromCommSync2(progress, -1);
    //             if(smartTxnEnabled)
    //                 HttpCommStartUploadingTxn(progress, -1);
    //             return ret;
    //         }
    //         return { success: false, error: 'Previous data sync is going on' };
    //     }
    //
    //     bSyncDataGoingOn = true;
    //     bSyncStopRequested = false;
    //     let success = await this.SyncDataAsyncImpl2(progress, syncNames, firstCheck, distCd, txnUpload);
    //     // let success = await this.SyncDataAsyncImpl(progress, ["profile-cust"], firstCheck, "D02");
    //     // let success = await this.SyncDataAsyncImpl(progress, ["SYNC"], firstCheck);
    //     bSyncDataGoingOn = false;
    //     return success;
    // }


    StopCommSync () {
        //Logger.Event(`----HttpCommSyncStop is invoked, bSyncDataGoingOn:${bSyncDataGoingOn},bSyncStopRequested:${bSyncStopRequested}`);
        if(!bSyncDataGoingOn)
            return;
        bSyncStopRequested = true;
        gDownloadFilesManager.stopDownloadTasks();
        //Logger.Event(`====HttpCommSyncStop is invoked, bSyncDataGoingOn:${bSyncDataGoingOn},bSyncStopRequested:${bSyncStopRequested}`);
    }
    //return {"success": true } or {"success":false, "error":"bala bala"}
    async SyncDataAsyncImpl2(progress: ProgressReportFunc, syncNames: string[], firstCheck: boolean,
                             distCd: string, txnUpload:TxnUploadParam) {
        try {
            // Will popup UI
            let dataInToken = await gAuth.GetTokenInfoAsync(progress);
            if (!dataInToken) {
                let err = 'SyncData Fail: Cannot get token';
                Logger.Error(err);
                return { success: false, error: err };
            }

            // Check if login mode has changed called after GetTokenInfoAsync to ensure there is base url saved
            let userInfo = gAuth.LoadUserInfo();
            if (userInfo && userInfo.base_url) {
                if(firstCheck) {
                    let loginModeResult: LoginModeResult = {success: false, error: ""};
                    //await gAuth.getLoginModeAsync(userInfo.base_url, loginModeResult);
                    if (loginModeResult.success && loginModeResult.loginMode) {
                        let localLocalMode = userInfo.login_mode;
                        if (localLocalMode != null && localLocalMode != loginModeResult.loginMode) {
                            // If log in mode changed just inform app with callback and proceed
                            progress({
                                cat: "Authenticate",
                                subCat: "LoginMechanismChanged",
                                name: loginModeResult.loginMode,
                                status: "completed"
                            });
                        }
                        // Update the local login mode
                        userInfo.login_mode = loginModeResult.loginMode;
                        gAuth.UserInfoJSON = userInfo;
                        gAuth.SaveUserInfo();
                    } else if (loginModeResult.isNetworkError) {
                        // 2710: No network available. Please ensure that network connection is available and then try again.
                        // 2711: Authentication
                        await CommAlertAsync('IDS_HTTPCOMM_NO_NETWORK', 'IDS_HTTPCOMM_AUTH_DIALOG_TITLE');
                        return {success: false, error: "Unable to check login mechanism, no network connection."};
                    } else {
                        Logger.Warn(`Unable to get server login mode: ${loginModeResult.error}`);
                    }
                }
            } else {
                let err = `SyncData Fail: Invalid user info baseUrl: ${userInfo?.base_url}, loginMode: ${userInfo?.login_mode}`;
                Logger.Error(err);
                return { success: false, error: err };
            }
            return await this.SyncDataWithTokenAsync(dataInToken, progress, firstCheck, syncNames, distCd, txnUpload);
        } catch (e) {
            let err = 'SyncData Fail:' + e;
            Logger.Error(err);
            progress({ cat: 'TblSync', subCat: '', name: '', status: 'failed', detail: "" + e });
            return { success: false, error: err };
        }
    };

    private async SyncDataWithTokenAsync(dataInToken: DataInToken, progress: ProgressReportFunc,
                          firstCheck: boolean, syncNames: string[], distCd: string, txnUpload:TxnUploadParam)
    {
        let firstCheckReply:FirstCheckResult|undefined;
        if(firstCheck && (txnUpload===true || txnUpload ===false)) {
            let validation = await gHttpMobileManager.FirstCheckValidationAsync('COMM_START', dataInToken);
            if (!validation.success) {
                let err = 'SyncData Fail: Cannot pass first check validation';
                Logger.Error(err);
                return {success: false, error: err};
            }
            firstCheckReply=validation.data;
        }
        let uploadResult: SuccessOrErrorDesc = {success: true, error: ''};
        let manifestObj = await gHttpMobileManager.LoadManifestFile();
        if (manifestObj) {
            // if(txnUpload===true || Array.isArray(txnUpload)) {
            //     progress({cat: 'UploadTxn', subCat: '', name: '', status: 'start'});
            //     if(!bUploadingTxn) {
            //         bUploadingTxn = true;
            //         if (txnUpload === true)
            //             uploadResult = await this.UploadAllTxnsAsync(null, 0, dataInToken, manifestObj, progress);
            //         else
            //             uploadResult = await this.UploadAllTxnsAsync(txnUpload, 0, dataInToken, manifestObj, progress);
            //         bUploadingTxn = false;
            //     }else
            //         uploadResult = {success: false, error: 'previous txn uploading is going on'};
            //     if (uploadResult.success) {
            //         RecordLastSubmittedTimeStamp();
            //         progress({cat: 'UploadTxn', subCat: '', name: '', status: 'completed'});
            //     } else {
            //         progress({
            //             cat: 'UploadTxn',
            //             subCat: '',
            //             name: '',
            //             status: 'failed',
            //             detail: uploadResult.error??""
            //         });
            //         let timestamp = GetLastSubmittedTimeStamp();
            //         if (!timestamp)
            //             RecordLastSubmittedTimeStamp();
            //         //have to continue, thus app will have a chance to update wrong manifest file.
            //     }
            // }
        } else {
            if (gHttpMobileManager.GetVersionInfo('MANIFEST_VER')) {
                let ret = {success: false, error: 'TableSyncAsync Fail: Cannot load manifest file'};
                Logger.Error(ret.error);
                return ret;
            }
        }
        let ret = {success: true, error: ''};
        let firstCheckResult = {success: true, restart: false};
        if (firstCheck && uploadResult.success)
            firstCheckResult = await gHttpMobileManager.FirstCheckUI('COMM_START', dataInToken, progress, firstCheckReply);

        if (firstCheckResult.restart) {
            await CommAlertAsync('IDS_MM_ENGINE_RESTART'/*Engine will need to restart to reload the new application/settings*/, 'IDS_MM_DIALOG_TITLE' /*'MMSvcs'*/);
            //gHttpMobileManager.RestartApp();
            return ret;
        }
        if (firstCheckResult.success) {
            manifestObj = gHttpMobileManager.LoadManifestFile();
            if (manifestObj) {
                for (let syncName of syncNames) {
                    let result = await TableSyncAsync(dataInToken, manifestObj, progress, syncName, distCd);
                    ret.success = ret.success && result.success;
                    if (!result.success && result.error)
                        ret.error = result.error;
                }
            } else {
                if (gHttpMobileManager.GetVersionInfo('MANIFEST_VER')) {
                    ret = {success: false, error: 'TableSyncAsync Fail: Cannot load manifest file'};
                    Logger.Error(ret.error);
                }
            }
        } else {
            ret = {success: false, error: 'FirstCheck Fail'};
        }
        return ret;
    }

    async SyncDataAsync(progress: ProgressReportFunc, syncNames: string[], firstCheck: boolean, distCd: string) {
        if (bSyncDataGoingOn)
            return { success: false, error: 'Previous data sync is going on' };
        bSyncDataGoingOn = true;
        bSyncStopRequested = false;
        let success = await this.SyncDataAsyncImpl(progress, syncNames, firstCheck, distCd);
        // let success = await this.SyncDataAsyncImpl(progress, ["profile-cust"], firstCheck, "D02");
        // let success = await this.SyncDataAsyncImpl(progress, ["SYNC"], firstCheck);
        bSyncDataGoingOn = false;
        return success;
    };

    //return {"success": true } or {"success":false, "error":"bala bala"}
    async SyncDataAsyncImpl (progress:ProgressReportFunc, syncNames:string[], firstCheck:boolean, distCd:string){
        try {
            // Will popup UI
            let dataInToken = await gAuth.GetTokenInfoAsync(progress);
            if (!dataInToken) {
                let err = 'SyncData Fail: Cannot get token';
                Logger.Error(err);
                return { success: false, error: err };
            }
            throwExceptionIfUserRequestToHalt();
            return await this.SyncDataWithTokenAsync(dataInToken, progress, firstCheck, syncNames, distCd, true);
        } catch (e) {
            let err = 'SyncData Fail:' + e;
            Logger.Error(err);
            progress({ cat: 'TblSync', subCat: '', name: '', status: 'failed', detail: "" + e });
            return { success: false, error: err };
        }
    };
    // async DoUploadTxnAsync (progress:ProgressReportFunc, arrTxnNames:string[]|null) {
    //     let dataInToken = await gAuth.GetTokenInfoAsync(progress);
    //     if(!dataInToken){
    //         Logger.Error('BGTxn: Fail to get token');
    //         return { success: false , error: "cannot get token" };
    //     }
    //     NativeNPSync.DeleteFileAll(GetHttpTmpFolder(), '__http_request*');
    //     let manifestObj = gHttpMobileManager.LoadManifestFile();
    //     if (manifestObj) {
    //         progress({ cat: 'UploadTxn', subCat: '', name: '', status: 'start' });
    //         //await gHttpDataSync.UploadAllTxnsAsync(0, dataInToken, manifestObj, progress);
    //         let uploadResult = await this.UploadAllTxnsAsync(arrTxnNames,0, dataInToken, manifestObj, progress);
    //         if (uploadResult.success) {
    //             RecordLastSubmittedTimeStamp();
    //             progress({ cat: 'UploadTxn', subCat: '', name: '', status: 'completed' });
    //         } else {
    //             progress({ cat: 'UploadTxn', subCat: '', name: '', status: 'failed', detail: uploadResult.error??"" });
    //             let timestamp = GetLastSubmittedTimeStamp();
    //             if (!timestamp)
    //                 RecordLastSubmittedTimeStamp();
    //             else{
    //                 timestamp.setDate(timestamp.getDate() + 7);
    //                 if(timestamp< new Date())
    //                     //The txn has not been transferred to server in 7 days, please contact administrator.
    //                     alert(NPGetText(IDS_HTTPCOMM_FAIL_TO_SUBMIT_TXN_IN_7DAYS));
    //             }
    //         }
    //         return uploadResult;
    //     } else {
    //         //has version , but failed to load manifest file
    //         if(gHttpMobileManager.GetVersionInfo('MANIFEST_VER') )
    //             Logger.Error('BGTxn: cannot load manifest file');
    //         else {
    //             //no version, no manifest file, it may be first time after a clean installation
    //             //keep silience?
    //             // if(IsDevEngine()){
    //             //     alert('UploadBgTxnImplAsync Fail: Cannot load manifest file');
    //             // }
    //         }
    //         //should treat it as success if no manifest file
    //         return { success: true, error: "" };
    //     }
    // };



    // ctxForBgTxnUploading:BGTxnUploadingContext= new BGTxnUploadingContext();
    // async UploadAllTxnsNowAsyncFromCommSync2(progress:ProgressReportFunc, intervalInMs:number):Promise<SuccessOrErrorDesc> {
    //     if (bAutoUploadTxn)
    //         return {success:false, error:"AutoUploadTxn is going on"};
    //     bAutoUploadTxn= true;
    //     this.ctxForBgTxnUploading.stopTimer();
    //     this.ctxForBgTxnUploading.prepareTaskForAllTxns(progress,intervalInMs);
    //     return await this.UploadTxnNowAsync(true);
    // };
    // UploadAllTxnsNow(progress:ProgressReportFunc, intervalInMs:number) {
    //     if (bAutoUploadTxn)
    //         return ;
    //     bAutoUploadTxn= true;
    //     this.ctxForBgTxnUploading.stopTimer();
    //     this.ctxForBgTxnUploading.prepareTaskForAllTxns(progress,intervalInMs);
    //     this.UploadTxnNowAsync(false);
    // };
    // async UploadTxnNowAsync(bFromCommSyncApi:boolean):Promise<SuccessOrErrorDesc> {
    //     this.ctxForBgTxnUploading.cleanTimerId();
    //     if (!bUploadingTxn){
    //         this.ctxForBgTxnUploading.consolidateTxnTasks();
    //         if(!this.ctxForBgTxnUploading.hasPendingTasks())
    //             return {success:true};
    //         bUploadingTxn = true;
    //         let arrTxnNames = this.ctxForBgTxnUploading.getTopTxnTask();//  this.txnBatch[0]===""? null:this.txnBatch[0].split('|');
    //         if(arrTxnNames!==null)
    //             Logger.Event('BGTxn: start to upload txn for '+arrTxnNames.join(","));
    //         else
    //             Logger.Event('BGTxn: start to upload all txns');
    //         MaxNumRetries = bFromCommSyncApi?5:1;
    //         let ret = await this.DoUploadTxnAsync(this.ctxForBgTxnUploading.cb4TxnUploading, arrTxnNames);
    //         MaxNumRetries = 5;
    //         bUploadingTxn = false ;
    //         if(ret.success) {
    //             Logger.Event("BGTxn: finished uploading txn");
    //             this.ctxForBgTxnUploading.discardTopTxnTask();
    //             if(bFromCommSyncApi)
    //                 return ret;
    //             if(this.ctxForBgTxnUploading.hasPendingTasks())
    //                 return await this.UploadTxnNowAsync(false);
    //             return ret;
    //         }else {
    //             if(bFromCommSyncApi) {
    //                 Logger.Event('BGTxn: failed to upload txn');
    //                 return ret;
    //             }
    //             //fail, retry
    //             let p = new Promise<SuccessOrErrorDesc>((resolve2) => {
    //                 this.ctxForBgTxnUploading.timerIdForBGTxnUploading=SetTimeout(() => {
    //                      Logger.Event(`BGTxn: timer "${this.ctxForBgTxnUploading.timerIdForBGTxnUploading}" gets fired`);
    //                      this.UploadTxnNowAsync(false).then(v=>{resolve2(v)});
    //                  },  this.ctxForBgTxnUploading.intervalInMsForTxnUploading)});
    //             Logger.Event(`BGTxn: failed to upload txn, created timer "${this.ctxForBgTxnUploading.timerIdForBGTxnUploading}" to resume txn uploading in ${this.ctxForBgTxnUploading.intervalInMsForTxnUploading} ms`);
    //             return await p;
    //         }
    //     }else{
    //         //busy,
    //         let p = new Promise<SuccessOrErrorDesc>((resolve2) => {
    //             this.ctxForBgTxnUploading.timerIdForBGTxnUploading=SetTimeout(() => {
    //                     Logger.Event(`BGTxn: timer "${this.ctxForBgTxnUploading.timerIdForBGTxnUploading}" gets fired`);
    //                     this.UploadTxnNowAsync(bFromCommSyncApi).then(v=>{resolve2(v)});
    //                 } , 15*1000)});
    //         Logger.Event(`BGTxn: busy, created timer "${this.ctxForBgTxnUploading.timerIdForBGTxnUploading}" to resume txn uploading in 15 seconds`);
    //         return await p;
    //     }
    // };
    // StopBgTxnUploading () {
    //     bAutoUploadTxn = false;
    //     this.ctxForBgTxnUploading.stopTimer();
    //     this.ctxForBgTxnUploading = new BGTxnUploadingContext();
    // };
    // StartSmartTxnUploading () {
    //     if(!bAutoUploadTxn)
    //         return ;
    //     try {
    //         SetTimeout(
    //                 () => {
    //                     let txnNames=__Comm2GetAndResetSmartTxnTables(true);
    //                     if(!bAutoUploadTxn)
    //                         return;
    //                     this.ctxForBgTxnUploading.txnBatch.push(txnNames);
    //                     const taskLength=this.ctxForBgTxnUploading.txnBatch.length;
    //                     if(taskLength<=1){
    //                         this.UploadTxnNowAsync(false);
    //                     }else if(this.ctxForBgTxnUploading.timerIdForBGTxnUploading != 0){
    //                         //this.ctxForBgTxnUploading.stopTimer();
    //                         //this.UploadTxnNowAsync();
    //                         Logger.Event(`BGTxn: Relinquish uploading now, timer "${this.ctxForBgTxnUploading.timerIdForBGTxnUploading}" will upload ${taskLength} txn tasks`);
    //                     }else
    //                         Logger.Event(`BGTxn: Relinquish uploading now because uploading ${taskLength} txn tasks is going on`);
    //                 }
    //                 , 5*1000);
    //     } catch (e) {
    //         Logger.Error('BGTxn: fail to upload txn, error:' + JSON.stringify(e));
    //         __Comm2GetAndResetSmartTxnTables(false);
    //     }
    // };
}();
