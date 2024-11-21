import {Credential, FCStorage, FirstCheckDir, IsDevEngine} from './Common';
import NativeNPSync from '../specs/NativeNPSync.ts';

export let gStorageConfig = (() => {
    let file = FirstCheckDir +'/StorageConfig.json';
    let secureFileName = FirstCheckDir +"/SecretStorageConfig";
    return {
        GetStorageInfo: (key: string):Credential|string => {
            try {
                let storageObj = JSON.parse(NativeNPSync.LoadFile(file));
                let keyObj:any;
                if(storageObj.hasOwnProperty("STORAGE_CONFIG"))
                    keyObj = storageObj.STORAGE_CONFIG[key] || '';
                else
                    keyObj = storageObj[key] || '';
                if (key === "CREDENTIALS" && !IsDevEngine()) {
                    keyObj.secret_access_key = NativeNPSync.LoadFile(secureFileName).trim();
                }
                return keyObj;
            } catch (error) {
                return '';
            }
        },
        WriteToFile: (value: FCStorage) => {
            if (!IsDevEngine()) {
                let secretKey = value.CREDENTIALS.secret_access_key||"";
                delete value.CREDENTIALS.secret_access_key;
                NativeNPSync.WriteFile(secureFileName, secretKey, "w");
                NativeNPSync.WriteFile(file, JSON.stringify(value), 'w');
                value.CREDENTIALS.secret_access_key=secretKey;
            }
            else
                NativeNPSync.WriteFile(file, JSON.stringify(value), 'w');
        }
    };
})();

