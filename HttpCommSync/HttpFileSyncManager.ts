import {
    CommSector, convertRowIdsToByteArray, countBy, DataInToken, Logger,
    Manifest, ProgressReportFunc, TxnDefinition, WorkDir,
} from './Common';
//import {gHttpDataSync} from "./HttpDataSync";
import {gHttpMobileManager} from "./MobileManager";
import {gHttpAsync} from "./HttpAsync";
//import {gAuth} from "./OAuth";
import NativeNPSync, {FileRecU} from '../specs/NativeNPSync.ts';
import FileSystem from 'react-native-fs';
import {GetHardwareId} from './Common';
import {GetEngineVersion} from './Common';
import {GetAppVersion} from './Common';
import {gAuth} from './OAuth.ts';
import {gHttpDataSync} from './HttpDataSync.ts';
export const  BINARY_FILE_FOLDER= WorkDir;

function ExistFile(fileName: string) {
    return NativeNPSync.Exists(`${BINARY_FILE_FOLDER}/${fileName}`);
}
export type FileRecD={
    //"795FD9BB:383DA764-6B98-44C0-9286-11B1B0B7A441",
    ID:string;
    //"https://objectstore-svc-extDemo.cfapps.jp10.hana.ondemand.com/api/v1.0/download/storage/product/PICTURE/empty-shop-front-vector-9560895-1578378693292.jpg",
    URL:string;
    COLUMN_NAME:string;
    SyncMethod:"Refresh"|string;
    //"empty-shop-front-vector-9560895.jpg",
    FILE_NAME?:string;
    FULL_FILE_NAME?:string;

    table?:string;
    shortFileName?:string;
    numAttempts?:number;
    tempFileName?:string;
    msToRetry?:number;

}

type TrackingTableD = {
    total: number;
    processedCount: number;
    startedCount: number;
    inProgress: boolean;
    successDownloads: FileRecD[];
}


type FileUploadStatus = {
   total:number;
   count:number;
}

type TrackingTableU = {
    total: number;
    processedCount: number;
    startedCount: number;
    inProgress: boolean;
    successUploads: FileRecU[];
    rowTracker:Map<string, FileUploadStatus>;
};

type TrackMapD = Map<string, TrackingTableD>

type resolve_t = (value?: any | PromiseLike<any>) => void

export type ReducedReportArg={
    //cat: string;
    //subCat: string;
    name?: string;
    status?: string;
    detail?: string;
    current?: number;
    total?: number;
}

const blackhole = (_arg:ReducedReportArg) => {}
export type ReducedReportFunc = typeof blackhole

export var gDownloadFilesManager = new class {

    downloadRequests:FileRecD[] = [];
    retryRequests:FileRecD[] = [];
    downloadTracker:TrackMapD = new Map<string, TrackingTableD>();

    progress:ReducedReportFunc|null= null;
    dataInToken:DataInToken|null =null;
    tasks:(Promise<void>|null)[] = [null, null, null, null];
    cancellationsOfSchedule:(null|(()=>void))[] = [null, null, null, null];

    init(progress:ReducedReportFunc, dataInToken:DataInToken){
        this.progress = progress;
        this.dataInToken = dataInToken;
    };

    async appendFileDownloadingTasksAsync (table:string, fileRecords:FileRecD[]){
        let existDownloadedFiles:FileRecD[] = []; // File already exist keep record to update DB path
        let validDownloadRequests:FileRecD[]= []; // Files to be downloaded
        //fileRecords.forEach((fileRequest) => {
        for(let fileRequest of fileRecords) {
            let errorDetails = '';

            fileRequest.table = table;
            //Logger.Data(`downoad file request:${JSON.stringify(fileRequest)}`);
            //"795FD9BB:383DA764-6B98-44C0-9286-11B1B0B7A441",
            if (!fileRequest.ID) errorDetails += 'Missing ID. ';
            //"https://objectstore-svc-extDemo.cfapps.jp10.hana.ondemand.com/api/v1.0/download/storage/product/PICTURE/empty-shop-front-vector-9560895-1578378693292.jpg",
            if (!fileRequest.URL) errorDetails += 'Missing URL. ';
            if (errorDetails) {
                //skipFile = true;
                Logger.Event(`Skip downloading ${JSON.stringify(fileRequest)} due to ${errorDetails}`);
                continue;
            }
            fileRequest.numAttempts = 0;
            fileRequest.shortFileName = fileRequest.ID.replace(/[\/:*?"<>\-|]/g, '');

            let urlPartArr = fileRequest.URL.split(".");
            if (urlPartArr.length > 1) {
                let extension = urlPartArr[urlPartArr.length - 1];
                if (extension.length < 5)
                    fileRequest.shortFileName += "." + extension;
            }
            fileRequest.tempFileName = `${BINARY_FILE_FOLDER}/${table}__temp/${fileRequest.shortFileName}`;
            fileRequest.FILE_NAME = `${table}/${fileRequest.shortFileName}`;
            fileRequest.FULL_FILE_NAME = `${BINARY_FILE_FOLDER}/${table}/${fileRequest.shortFileName}`;

            // Check Sync Method
            if (fileRequest.SyncMethod === 'Refresh' &&  NativeNPSync.Exists(fileRequest.FULL_FILE_NAME)) {
                // Check if file exists in ${Table}
                // If exists, copy to ${Table}__temp
                // else download it
                let tmpFile= fileRequest.tempFileName;
                // let timeout = existDownloadedFiles.length%10==9 ? 0:10;
                // let p = new Promise<void>((resolve) => {
                //     setTimeout(async () => {
                        NativeNPSync.WriteFile(tmpFile, '', 'w');
                        NativeNPSync.DeleteFile(tmpFile);
                        //console.log(`delete ${tmpFile}`);
                        //console.log(`trying to copy file: ${fileRequest.FULL_FILE_NAME} to ${tmpFile}`);
                        await FileSystem.copyFile(fileRequest.FULL_FILE_NAME!, tmpFile);
                        //console.log(`**** end of copying file: ${fileRequest.FULL_FILE_NAME} to ${tmpFile}`);
                        Logger.Event(`Sync Method: ${fileRequest.SyncMethod}. Skip downloading ${fileRequest.FILE_NAME} because it already exists.`);
                        existDownloadedFiles.push(fileRequest);
                //         resolve();
                //     }, timeout);
                // });
                // await p;
            }else
                validDownloadRequests.push(fileRequest);
        }
        this.initTracker(table, validDownloadRequests, existDownloadedFiles);
        this.downloadRequests = this.downloadRequests.concat(validDownloadRequests);
    };

    initTracker(table:string, fileRequests:FileRecD[], existDownloadedFiles:FileRecD[]){
        this.downloadTracker.set(table, {
            total: fileRequests.length,
            processedCount: 0,
            startedCount: 0,
            inProgress: false,
            successDownloads: existDownloadedFiles
        });
    };

    cleanup(){
        this.downloadRequests = [];
        this.retryRequests = [];
        this.downloadTracker.clear();
        this.progress = null;
        this.dataInToken = null;
        this.tasks = [null, null, null, null];
        this.cancellationsOfSchedule = [null, null, null, null];
    };

    stopDownloadTasks(){
        for (let i = 0; i < this.cancellationsOfSchedule.length; i++) {
            let cancelFunc = this.cancellationsOfSchedule[i];
            if(cancelFunc) cancelFunc();
        }
        this.cleanup();
    }

    startDownloadTasks() {
        //let num_working_tasks = 0;
        //for (let i = 0; i < this.tasks.length; i++) {
        //    if (this.tasks[i]) num_working_tasks++;
        //}

        if (this.downloadRequests.length <= 0)
            return;

        for (let i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i]){
                let cancelFunc = this.cancellationsOfSchedule[i];
                //don't wait for the timeout to pull request form retryRequests to downloadRequests
                //just cancel schedule and pick up an item in downloadRequests to download it
                if(cancelFunc) cancelFunc();
            }
        }

        for (let i = 0; i < this.tasks.length; i++) {
            //if (this.downloadRequests.length > num_working_tasks) {
            if (!this.tasks[i]) {
                let task_func = async () => {
                    while (this.downloadRequests.length > 0) {
                        await this.downloadFileTaskAsync();

                        if (this.retryRequests.length > 0) {
                            //const { retryPromise, cancel } = this.performRetryAsync();
                            const retryTask = this.performRetryAsync();
                            this.cancellationsOfSchedule[i] = retryTask.cancel;
                            await retryTask.promise;
                            this.cancellationsOfSchedule[i] = null;
                        }
                    }
                    this.tasks[i] = null;
                };
                //      num_working_tasks++;
                this.tasks[i] = task_func();
            }
            //}
        }

    };

    async downloadSingleFileAsync(fileRequest:FileRecD){
        if(!fileRequest.table)
            return ;
        if(!this.dataInToken)
            return ;
        let tracker = this.downloadTracker.get(fileRequest.table);
        if(!tracker)
            return ;

        let trap= this.progress || blackhole;
        if (!tracker.inProgress) {
            tracker.inProgress = true;
            trap({ status: 'start', total: tracker.total });
        }

        tracker.startedCount++;
        if (fileRequest.numAttempts === 0) {
            Logger.Event(`Start downloading ${fileRequest.FILE_NAME}. ${tracker.startedCount}/${tracker.total}`);
            trap({ detail: `${fileRequest.FILE_NAME}`, status: 'progress', current: tracker.startedCount, total: tracker.total });
        }

        let url = fileRequest.URL;
        let temp = url.split('/');
        let size = temp.length;
        let path = `${temp[size - 3]}/${temp[size - 2]}/${temp[size - 1]}`;

        let response = await gHttpMobileManager.DownloadPackageFileAsync(path, () => { }, this.dataInToken,
            { fileName: fileRequest.FILE_NAME });
        if(!response) {
            Logger.Warn(`Failed to download ${fileRequest.FILE_NAME}`);
            return ;
        }
        if (response.type==="RESULT_RSP" && (response.rsp_code === 201 || response.rsp_code === 200)) {
            let originFile = response.rsp_data;
            if(fileRequest.tempFileName)
                NativeNPSync.MoveFile(originFile!, fileRequest.tempFileName);
            tracker.successDownloads.push(fileRequest);
            Logger.Event(`Successfully downloaded ${fileRequest.FILE_NAME}.`);
        } else {
            let error="";
            if(response.type==="RESULT_RSP") {
                let originFile = response.rsp_data;
                error = gHttpAsync.GetFileContent(response);
                NativeNPSync.DeleteFile(originFile!);
            } else
                error =response.error_desc;

            const maxAttempts = 3;
            fileRequest.numAttempts = (fileRequest.numAttempts??0) +1;
            //todo: should delete file based on rsp type?
            //if (response.type === 'RESULT_ERR') {
            //    DeleteFile(`__http_request_working_${response.req_id}_rcv__.bin`);
            //} else {
            //}

            if (fileRequest.numAttempts < maxAttempts) {
                fileRequest.msToRetry = Date.now() + 2000;
                this.retryRequests.push(fileRequest);
                Logger.Event(`Attempt ${fileRequest.numAttempts}, failed to download ${fileRequest.FILE_NAME}, will retry in 2 seconds\nErr: ${error}.`);
                return;
            } else {
                Logger.Error(`Failed to download ${fileRequest.FILE_NAME} after ${maxAttempts} attempts\nErr: ${error}.`);
            }
        }
    }

    async downloadFileTaskAsync (){
        while (this.downloadRequests.length > 0) {
            let downloadRequest = this.downloadRequests.shift();
            if(downloadRequest)
                await this.downloadSingleFileAsync(downloadRequest);
        }
    };

    async waitAllFilesDownloaded (){
        let remaining_tasks = this.tasks.filter((value)=>value!==null);
        // for (let i = 0; i < this.tasks.length; i++) {
        //     if (this.tasks[i] !== null)
        //         remaining_tasks.push(this.tasks[i]);
        // }
        await Promise.all(remaining_tasks);
    };

    performRetryAsync(){
        let msToRetry = this.retryRequests.reduce((prevValue, request)=>{
            return Math.min(prevValue, request.msToRetry??Date.now());
        },Date.now()+3000);

        msToRetry = msToRetry - Date.now();
        if (msToRetry < 1) msToRetry = 1;
        let resolved:resolve_t|null = null;
        let timeIdx = -1;
        let promise = new Promise<void>((resolve) => {
            resolved = resolve;
            // @ts-ignore
            timeIdx = setTimeout(() => {
                const now = Date.now() + 500;
                this.retryRequests.forEach((retryRequest, index, object) => {
                    if ((retryRequest.msToRetry??Date.now()) <= now) {
                        object.splice(index, 1);
                        this.downloadRequests.push(retryRequest);
                    }
                });
                resolve();
            }, msToRetry);
        });
        let cancel = () => {
            if (timeIdx !== -1) clearTimeout(timeIdx);
            if (resolved !== null) resolved();
        }
        return { promise, cancel };
    };
};

export var gUploadFilesManager = new class {
    uploadRequests:FileRecU[] = [];
    retryRequests:FileRecU[] = [];
    dataInToken:DataInToken|null=null;
    commData:CommSector|null=null;
    progress:ProgressReportFunc|null=null;
    // downloadPath:string = "";
    txnTracker:Map<string,TrackingTableU> = new Map<string,TrackingTableU>();

    init(progress:ProgressReportFunc, dataFromToken:DataInToken, _manifest:Manifest){
        this.dataInToken = dataFromToken;
        this.commData = {
            TenantID: dataFromToken.CompanyId,
            AppID: dataFromToken.AppId,
            HardwareID: GetHardwareId(),
            EngVersion: GetEngineVersion(),
            AppVersion: GetAppVersion(),
            Type: 'TRANSACTION',
            RequestDT: new Date().toISOString(),
            MsgID:0,
            RefreshToken:gAuth.UserInfoJSON?.refresh_token||""

        };
        this.progress = progress;
        // this.downloadPath = manifest.TRANSACTION.ObjectStoreService.replace('upload', 'download');
        // {txnDefName : {total, processedCount, rowTracker: {total, count}, inProgress: false, successUploads: []}}
        this.txnTracker.clear() ;
        //[{fileName, columnName, commsStatus, table, rowid, fileID, logicID, downloadPath, shortUrl, url, txnName, headerName, uploadStatus}]
        this.uploadRequests = [];
        this.retryRequests = [];
    };
    cleanup  (){
        this.txnTracker.clear();
        this.uploadRequests = [];
        this.retryRequests = [];
        this.progress = null;
        // this.downloadPath = '';
        this.commData = null;
        this.dataInToken = null;
    }

    initTxnTracker (txnDefName:string, txnFiles:FileRecU[]){
        let tracker:TrackingTableU = {
            total: txnFiles.length,
            processedCount: 0,
            startedCount: 0,
            inProgress: false,
            rowTracker: new Map<string, FileUploadStatus>(),
            successUploads: []
        };
        this.txnTracker.set(txnDefName,tracker);

        let rowidAndCount = countBy(txnFiles, 'strRowID') as {[strRowID:string]:number};
        for (let [rowid, count] of Object.entries(rowidAndCount)) {
            tracker.rowTracker.set(rowid, {
                total: count as number,
                count: 0
            });
        }
    }

    appendTxnUploadingTasks (objstoreUrl:string, uploadFiles:FileRecU[], txn_def:TxnDefinition){
        //if (objstoreUrl && !objstoreUrl.endsWith('/'))
        //    objstoreUrl += '/';
        uploadFiles.forEach((file) => {
            file.strRowID = file.rowid + '_' + file.rowidHi;
            file.fileID = file.fileName.substr(file.fileName.lastIndexOf('/') + 1);
            file.LogicID = txn_def.ClientSchema.Header.LogicID || txn_def.ClientSchema.Header.Name;
            //still keep the extension name in url
            file.shortUrl = `${file.LogicID}/${file.columnName}/${file.fileID}`; // for s3 usage
            //file.url = `${objstoreUrl}${file.shortUrl}`; // default upload url

            //remove externsion
            file.fileID = file.fileID.replace(/\.[^.]*$/, '');
            file.commsStatus = file.commsStatus === 'P' ? 'T' : file.commsStatus;
            file.txnDefName = txn_def.Name;
            file.headerName = txn_def.ClientSchema.Header.Name;
            file.numAttempts = 0;
            file.msToRetry =0;
        });

        this.initTxnTracker(txn_def.Name, uploadFiles);
        this.uploadRequests = this.uploadRequests.concat(uploadFiles);

    }

    private setCommsStatus({ rowids = [], commsStatus = '', txnDefName, headerName }
                          :{rowids:[number,number][],commsStatus:string, txnDefName:string, headerName:string }){
        if (rowids.length > 0 && commsStatus) {
            let rowidsByteArray = convertRowIdsToByteArray(rowids);
            NativeNPSync.__Comm2CommitTxn(txnDefName, headerName, {hasError:false, rowIDs: rowidsByteArray }, commsStatus);
        }
    }

    performRetryAsync() {
        let msToRetry = this.retryRequests.reduce((prevValue, request)=>{
            return Math.min(prevValue, request.msToRetry??Date.now());
        },Date.now()+2000);
        // let msToRetry = this.retryRequests[0].msToRetry;
        // for (let i = 1; i < this.retryRequests.length; i++) {
        //     if (this.retryRequests[i].msToRetry < msToRetry) {
        //         msToRetry = this.retryRequests[i].msToRetry;
        //     }
        // }
        msToRetry = msToRetry - Date.now();
        if (msToRetry < 1)
            msToRetry = 1;
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                const now = Date.now() + 500;
                this.retryRequests.forEach((retryRequest, index, object) => {
                    if (!retryRequest.msToRetry || retryRequest.msToRetry <= now) {
                        object.splice(index, 1);
                        this.uploadRequests.push(retryRequest);
                    }
                });
                resolve();
            }, msToRetry);
        });
    }

    async uploadAllFilesAsync (){
        //alert("this.uploadRequests.length="+this.uploadRequests.length);
        while (this.uploadRequests.length > 0 || this.retryRequests.length > 0) {
            let tasks:Promise<void> [] = [];
            const max_task = 8;
            const num_task = this.uploadRequests.length > max_task ? max_task : this.uploadRequests.length;
            for (let i = 0; i < num_task; i++) {
                tasks.push(this.uploadFileTask());
            }
            await Promise.all(tasks);

            if (this.retryRequests.length > 0) {
                await this.performRetryAsync();
            }
        }
    }
    async uploadTxnFilesPayload(txnDefName:string, progressLogger:ReducedReportFunc){
        let rec=this.txnTracker.get(txnDefName);
        if (!rec || rec.successUploads.length <= 0)
            return true;
        if(!this.commData || !this.dataInToken)
            return false;
        let emptyRec= new Array<[string,string,string,string]> ();
        // construct attachment payload structure
        let attachmentPayload = {
            Schema: {
                Name: `${txnDefName}#FILE`,
                Columns: ['ID', 'URL', 'TABLE_NAME', 'COLUMN_NAME']
            },
            Data: {
                Name: `${txnDefName}#FILE`,
                Records:emptyRec
            }
        };
        attachmentPayload.Data.Records = rec.successUploads
            .map ((record) => [record.fileID??"", record.shortUrl??"", record.table,record.columnName]);

        // submit attachment payload to server
        let metadataPayload = { Comm: this.commData, Payload:attachmentPayload};
        metadataPayload.Comm.Name = attachmentPayload.Schema.Name;
        metadataPayload.Comm.MsgID = Math.ceil(Math.random() * 65536 + 1);
        //metadataPayload.Payload = attachmentPayload;
        //Logger.Data("Payload:---------\n" + JSON.stringify(metadataPayload,null,2) + "\n-------");
        let rsp = await gHttpDataSync.UploadTxnAsync(JSON.stringify(metadataPayload), (status) => {
            let statusText = status.total === status.done ? 'completed' : 'progress';
            progressLogger({ name: `${txnDefName}#PAYLOAD`, status: statusText, current: status.done, total: status.total });
        }, this.dataInToken);
        try {
            if (!(rsp.type==="RESULT_RSP" &&  rsp.rsp_code >= 200 && rsp.rsp_code < 300)) {
                Logger.Error(`Received bad reply:${JSON.stringify(rsp)} for ${txnDefName}#PAYLOAD`);
                return false;
            }
            let rsp_data = JSON.parse(rsp.rsp_data);
            if (rsp_data && rsp_data.Comm.CorrelationMsgID === metadataPayload.Comm.MsgID) {
                if (rsp_data.Response.Status === 'OK') {
                    Logger.Event(`Server accept the payload of ${txnDefName}#PAYLOAD`);
                    return true;
                }
                else {
                    //if(rsp_data.Response.Status.startWith("R")!==-1)
                    if (rsp_data.Response.FailReason)
                        Logger.Error(`Server reject the payload of ${txnDefName}#PAYLOAD with ${rsp_data.Response.Status}:${rsp_data.Response.FailReason}`);
                    else
                        Logger.Error(`Server reject the payload of ${txnDefName}#PAYLOAD with ${rsp_data.Response.Status}`);
                    return false;
                }
            }
        } catch (e) {
            Logger.Error(`Received bad reply:${JSON.stringify(rsp)} for ${txnDefName}#PAYLOAD`);
            return false;
        }
    }
    async uploadSingleFileAsync(uploadRequest:FileRecU):Promise<void>{
        let headerName = uploadRequest.headerName??"";
        let txnDefName = uploadRequest.txnDefName??"";
        let progressLogger =(x:ReducedReportArg) => {
            if (this.progress){
                let newObj = Object.assign({cat: 'UploadTxn', subCat: 'File', name: `${txnDefName}#FILE`}, x);
                this.progress(newObj);
            }
        };

        let fileName = uploadRequest.fileName;
        let shortUrl = uploadRequest.shortUrl??"";
        let strRowID = uploadRequest.strRowID;
        let tracker = this.txnTracker.get(txnDefName);

        if(!tracker || !tracker.rowTracker || !strRowID || !this.dataInToken)
            return ;

        if (!tracker.inProgress) {
            tracker.inProgress = true;
            progressLogger({ status: 'start', total: tracker.total });
        }

        tracker.startedCount++;
        if (uploadRequest.numAttempts === 0)
            Logger.Event(`Start uploading ${fileName}. ${tracker.startedCount}/${tracker.total}`);

        //# means the file has been uploaded already, but the #file doesn't get updated
        if (uploadRequest.commsStatus === '#') {
            let trackedInfo = tracker.rowTracker.get(strRowID);
            if(trackedInfo)
                trackedInfo.count++;
            else {
                Logger.Error(`Cannot find trackedInfo for row ${strRowID} for table ${uploadRequest.table}`);
            }
            tracker.successUploads.push(uploadRequest);

            Logger.Event(`${fileName} already uploaded (commsStatus = #)`);
        } else if (uploadRequest.commsStatus === 'T') {
            if (!ExistFile(fileName) || fileName ==="") {
                //uploadRequest.uploadStatus = "H";
                if(fileName !=="") {
                    let errorDesc = `Failed to upload ${fileName} ( Rowid: ${strRowID} ). \nErr: File does not exist.`;
                    Logger.Error(errorDesc);
                }

                let rowids:[[number,number]]=[[uploadRequest.rowid, uploadRequest.rowidHi]];
                let commsStatus = 'S';
                this.setCommsStatus({ rowids, commsStatus, txnDefName, headerName });

                Logger.Debug(`Updated row id ${strRowID} T => S.`);
            }
            else {
                let param = {
                    filePath: fileName,
                    serverFilePath: shortUrl,
                    progress: progressLogger,
                    silentCallback: true,
                    skipRetry: true,
                    dataInToken: this.dataInToken
                };

                let response = await gHttpMobileManager.UploadPackageFileAsync(param);
                if (response?.type==="RESULT_RSP" && (response.rsp_code === 200 || response.rsp_code === 201)) { //200 is S3
                    //uploadRequest.uploadStatus = "S";
                    //uploadRequest.downloadUrl = `${this.downloadPath}${shortUrl}`;
                    //if(response.rsp_code === 201) {//object store
                    //	let payload = JSON.parse(response.rsp_data);
                    //	if(payload && payload.Location) {
                    //		uploadRequest.downloadUrl = payload.Location;
                    //	}
                    //}
                    tracker.successUploads.push(uploadRequest);
                    //tracker.rowTracker.get(strRowID).count++;
                    let trackedInfo = tracker.rowTracker.get(strRowID);
                    if(trackedInfo)
                        trackedInfo.count++;
                    else {
                        Logger.Error(`Cannot find trackedInfo for row ${strRowID} for table ${uploadRequest.table}`);
                        return;
                    }
                    Logger.Event(`Successfully uploaded ${fileName}.`);

                    // update commsStatus T => # when all upload requests of same row id get uploaded
                    if (trackedInfo.count === trackedInfo.total) {
                        let rowids:[[number,number]] = [[uploadRequest.rowid, uploadRequest.rowidHi]];
                        let commsStatus = '#';
                        this.setCommsStatus({ rowids, commsStatus, txnDefName, headerName });

                        Logger.Event(`Updated row id ${strRowID} T => #.`);
                    }
                }
                else {
                    let error_desc = JSON.stringify(response);
                    uploadRequest.numAttempts = (uploadRequest.numAttempts??0) +1;
                    const maxAttempts = 3;
                    if (uploadRequest.numAttempts < maxAttempts) {
                        uploadRequest.msToRetry = Date.now() + 2000;
                        this.retryRequests.push(uploadRequest);
                        Logger.Error(`Attempt ${uploadRequest.numAttempts}, failed to upload ${fileName} ( Rowid: ${strRowID} ), will retry in 2 seconds\nErr: ${error_desc}.`);
                        return;
                    } else {
                        Logger.Error(`Failed to upload ${fileName} ( Rowid: ${strRowID} ) after ${maxAttempts} attemps\nErr: ${error_desc}.`);
                    }
                }
            }
        }

        tracker.processedCount++;
        progressLogger({ status: 'progress', current: tracker.processedCount, total: tracker.total });

        // update commsStatus # => S when all upload requests of same txn id get uploaded
        if (tracker.processedCount === tracker.total) {
            //Logger.Debug(`UploadTxnFilesPayload`);
            let success = await this.uploadTxnFilesPayload(txnDefName, progressLogger);
            let tempProgressObj:ReducedReportArg= {};
            if (success) {
                let commsStatus = 'S';
                let rowids:[number,number][] = [];
                let strRowids = new Set();
                tracker.successUploads.forEach((record) => {
                    if (!strRowids.has(record.strRowID)) {
                        strRowids.add(record.strRowID);
                        rowids.push([record.rowid, record.rowidHi]);
                    }
                });
                if (tracker.successUploads.length > 0) {
                    this.setCommsStatus({ rowids, commsStatus, txnDefName, headerName });
                    Logger.Debug(`Updated row id ${Array.from(strRowids).toString()} # => S.`);
                }
                if (tracker.successUploads.length < tracker.total) {
                    tempProgressObj.detail = `${tracker.total - tracker.successUploads.length} files failed to upload`;
                }
                tempProgressObj.current = tracker.successUploads.length;
                tempProgressObj.total = tracker.total;

            } else {
                tempProgressObj.detail = 'fail to upload payload';

            }
            tracker.inProgress = false;
            tempProgressObj.status = 'completed';
            progressLogger(tempProgressObj);
            //delete this.txnTracker[txnDefName];
            this.txnTracker.delete(txnDefName);
        }
    }

    async uploadFileTask() {
        while (this.uploadRequests.length > 0) {
            let uploadRequest = this.uploadRequests.shift();
            if(uploadRequest)
                await this.uploadSingleFileAsync(uploadRequest);
        }
    }
}();
