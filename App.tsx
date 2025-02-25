import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  Button, Modal,Alert
} from 'react-native';

import NPSyncSpec, { IHttpResponse } from './specs/NativeNPSync';
import {CommAlertAsync, ReportArg, SetCommPromptChanger, WorkDir} from './HttpCommSync/Common.ts';
import { UserCredential} from './HttpCommSync/OAuth.ts';
import {
  HttpCommClearJWT,
  FirstCheck,
  HttpCommSync,
  HttpCommStartUploadingTxn,
  HttpCommStopUploadingTxn,
} from './HttpCommSync/HttpCommSyncAPI.ts';
import * as SQLite from './expo_sqlite2';

const EMPTY = '<empty>';

function App(): React.JSX.Element {
  const [value, setValue] = React.useState<string | null>(null);
  const [commPrompt, setCommPrompt] = React.useState<{title:string, desc:string, visible:boolean}>({title:"",desc:"", visible:false});
  const [editingValue, setEditingValue] = React.useState<string | null>(null);

  function ChangeCommPromptInternal(title:string, desc:string, visible:boolean )
  {
    setCommPrompt({title:title, desc:desc, visible:visible});
  }
  SetCommPromptChanger(ChangeCommPromptInternal);
  React.useEffect(() => {
    //const storedValue = NativeLocalStorage?.getItem('myKey');
    //setValue(storedValue ?? '');
  }, []);
  function syncImages(){
    const db = SQLite.openDatabaseSync('databaseName');
    db.useForHttpDataSync();
    //NPSyncSpec.DeleteFolder(WorkDir+"/M_PRD");

    HttpCommSync((arg: ReportArg)=>{
      console.log(JSON.stringify(arg));
    }, ['profile-image']).then((sucess:boolean) => {
      console.log("sync finished:"+sucess);
      db.closeSync();
      //db.closeAsync();
    })

    //db.closeSync();
    //NPSyncSpec.TestSqliteDB(db.)
  }
  function syncDB(){
    const db = SQLite.openDatabaseSync('databaseName');
    db.useForHttpDataSync();
    //NPSyncSpec.DeleteFolder(WorkDir+"/M_PRD");

    HttpCommSync((arg: ReportArg)=>{
       console.log(JSON.stringify(arg));
    }, ['9.1.0.0_SYNC']).then((sucess:boolean) => {
        console.log("sync finished:"+sucess);
        db.closeSync();
        //db.closeAsync();
    })
  }
  async function sqliteTest2(){
    //await 1;
    try {
      console.log('sqliteTest');
      //const dbx = SQLite.openDatabaseSync('databaseName');
      const db = await SQLite.openDatabaseAsync('databaseName');

      // `execAsync()` is useful for bulk queries when you want to execute altogether.
      // Please note that `execAsync()` does not escape parameters and may lead to SQL injection.
      await db.execAsync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY NOT NULL, value TEXT NOT NULL, intValue INTEGER);
  INSERT INTO test (value, intValue) VALUES ('test1', 123);
  INSERT INTO test (value, intValue) VALUES ('test2', 456);
  INSERT INTO test (value, intValue) VALUES ('test3', 789);
  `);
      //dbx.execSync(` PRAGMA journal_mode = WAL;`);

      // `runAsync()` is useful when you want to execute some write operations.
      const result = await db.runAsync('INSERT INTO test (value, intValue) VALUES (?, ?)', 'aaa', 100);
      console.log(result.lastInsertRowId, result.changes);
      await db.runAsync('UPDATE test SET intValue = ? WHERE value = ?', 999, 'aaa'); // Binding unnamed parameters from variadic arguments
      await db.runAsync('UPDATE test SET intValue = ? WHERE value = ?', [999, 'aaa']); // Binding unnamed parameters from array
      await db.runAsync('DELETE FROM test WHERE value = $value', {$value: 'aaa'}); // Binding named parameters from object

      // `getFirstAsync()` is useful when you want to get a single row from the database.
      const firstRow = await db.getFirstAsync('SELECT * FROM test');
      console.log(firstRow.id, firstRow.value, firstRow.intValue);

      // `getAllAsync()` is useful when you want to get all results as an array of objects.
      const allRows = await db.getAllAsync('SELECT * FROM test');
      for (const row of allRows) {
        console.log(row.id, row.value, row.intValue);
      }

      // `getEachAsync()` is useful when you want to iterate SQLite query cursor.
      for await (const row of db.getEachAsync('SELECT * FROM test')) {
        console.log(row.id, row.value, row.intValue);
      }
    }catch(err) {
      console.error(err);
    }
  }
  // function saveValue() {
  //   NativeLocalStorage?.setItem(editingValue ?? EMPTY, 'myKey');
  //   setValue(editingValue);
  // }

  // function clearAll() {
  //   NativeLocalStorage?.clear();
  //   setValue('');
  // }

  // function deleteValue() {
  //   NativeLocalStorage?.removeItem(editingValue ?? EMPTY);
  //   setValue('');
  // }
  function setValue2(v:string):void{
    setValue(v);
    //log.warn("setValue2:" + v);
  }
  function reverseValue() {
     let r = NPSyncSpec.reverseString(editingValue ?? EMPTY);
     setValue(r);
  }

  function callBackTest() {
    NPSyncSpec.echoFromCpp(editingValue ?? EMPTY, (text: string) => {
      setValue2(text);
    });
  }

  async function testPromise() {
    //NPSyncSpec.echoFromCpp(editingValue??EMPTY, (text:string)=>{ setValue(text) } );
    let text = await NPSyncSpec.callPromise('ha ha');
    setValue2(text);
  }
  function sendhttp() {
    NPSyncSpec.SendHttpRequestStr(
      (rsp: IHttpResponse) => {
        if(rsp.type==='RESULT_RSP') {
          setValue2(`got reply, code: ${rsp.rsp_data}`);
          setTimeout(() => {
            setValue2(JSON.stringify(rsp).substring(0, 40));
          }, 3000);
        }
      },
      'reqid',
      'POST',
      'https://www.google.com',
      '',
      '',
      '',
      100,
    );
  }

  async function getUserInfo(old:UserCredential):Promise<UserCredential|null> {
    // return await {
    //   url:'https://unza-my-qa.npa.accenture.com/mobile',
    //   loginMode:'MOBILE',
    //   user:'D13GT09',
    //   password:'Unza@123',
    //   newPassword:'Unza@123',
    //   error:old.error
    // };
    if(old.error){
      // await CommAlertAsync("error", old.error);
      let ok= await new Promise((resolve , __reject) => {
        Alert.alert(
          "error", old.error,
          [
            {text: 'OK', onPress: () => resolve(true)},
            {text: 'Cancel', onPress: () => resolve(false)},
          ]

        );
      });
      if(!ok)
        return null;
    }
    return await {
      url:'https://acme-intg.npa.accenture.com/mobile',
      loginMode:'MOBILE',
      user:'VS1',
      password:'Newspage@1',
      newPassword:'Newspage@1',
      error:old.error
    };
  }
  async function getToken(){
    // await FileSystem.mkdir(FileSystem.DocumentDirectoryPath+'/logs');
      //let  dataInToken = await gAuth.GetTokenInfoAsync();
      //setValue2(JSON.stringify(dataInToken));
      //console.log(dataInToken);
    HttpCommClearJWT();
    await  FirstCheck("ENG_START", getUserInfo);
  }

  async function uploadTxn() {
    const db = SQLite.openDatabaseSync('databaseName');
    db.useForHttpDataSync();
    //NPSyncSpec.DeleteFolder(WorkDir+"/M_PRD");

    await HttpCommStartUploadingTxn((arg: ReportArg) => {
      console.log(JSON.stringify(arg));
    }, 0);
    await db.closeAsync();
  }
  function stopUploading() {
    HttpCommStopUploadingTxn();
  }

  async function createTxn(){
    const db = await SQLite.openDatabaseAsync('databaseName');

    // `execAsync()` is useful for bulk queries when you want to execute altogether.
    // Please note that `execAsync()` does not escape parameters and may lead to SQL injection.
    await db.execAsync(`
    PRAGMA journal_mode = WAL;
     create table if NOT exists TXN_CUST ([ID] NVARCHAR(500),
   [CUST_CD] NVARCHAR(500),
   [CUST_NAME] NVARCHAR(500),
   [ADDRESS] NVARCHAR(500),
   [PICTURE] FILE,
   [DIST_CD] NVARCHAR(500),
   [DIST_NAME] NVARCHAR(500),
    [COMMS_STATUS] NVARCHAR(10),
    [COMMS_DATETIME] DATETIME,
   PRIMARY KEY(ID) );
   
    delete from txn_cust;

    insert into TXN_CUST  values('ID_0001', 'CUST_CD_0001',
                             'CUST_NAME_0001','ADDR1',
                             '', 'DISST_CD_001','dst_name_0302',
                               'P', datetime('now')
                            );

  insert into TXN_CUST  values('ID_0002', 'CUST_CD_0002',
                             'CUST_NAME_0002','ADDR2',
                             '', 'DISST_CD_002','dst_name_0303'
                                 ,'P', datetime('now')
                            );
  insert into TXN_CUST  values('ID_0003', 'CUST_CD_0003',
                             'CUST_NAME_0003','ADDR3',
                             '', 'DISST_CD_003','dst_name_0304'
                              ,'P', datetime('now')
  `);
    await db.closeAsync();
    // await FileSystem.mkdir(FileSystem.DocumentDirectoryPath+'/logs');
    //let  dataInToken = await gAuth.GetTokenInfoAsync();
    //setValue2(JSON.stringify(dataInToken));
    //console.log(dataInToken);
  }
  return (
    <SafeAreaView style={{flex: 1}}>
      <Text style={styles.text}>
        Current stored value is: {value ?? 'No Value'}
      </Text>
      <TextInput
        placeholder="Enter the text you want to store"
        style={styles.textInput}
        onChangeText={setEditingValue}
      />

      <Button title="sync db" onPress={syncDB} />
      <Button title="sync images" onPress={syncImages} />
      <Button title="callback" onPress={callBackTest} />
      <Button title="promise" onPress={testPromise} />
      <Button title="sendhttpreq" onPress={sendhttp} />
      <Button title="token" onPress={getToken} />
      <Button title="createtxn" onPress={createTxn} />
      <Button title="uploadtxn" onPress={uploadTxn} />
      <Button title="stop uploading" onPress={stopUploading} />
      <Modal
        animationType="slide"
        transparent={false}
        visible={commPrompt.visible ?? false}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
        }}
      >
        <Text style={styles.text}>
          title: {commPrompt.title}
        </Text>
        <Text style={styles.text}>
          Desc: {commPrompt.desc}
        </Text>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  text: {
    margin: 10,
    fontSize: 10,
  },
  textInput: {
    margin: 4,
    height: 40,
    borderColor: 'black',
    borderWidth: 1,
    paddingLeft: 2,
    paddingRight: 2,
    borderRadius: 2,
  },
});

export default App;
