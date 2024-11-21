import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  Button, Modal,Alert
} from 'react-native';

import NPSyncSpec, { IHttpResponse } from './specs/NativeNPSync';
import {SetCommPromptChanger} from './HttpCommSync/Common.ts';
import {gAuth} from './HttpCommSync/OAuth.ts';
import FileSystem from 'react-native-fs';
import {FirstCheck} from './HttpCommSync/HttpCommSyncAPI.ts';
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
    NPSyncSpec.SendHttpRequest(
      (rsp: IHttpResponse) => {
        setValue2(`got reply, code: ${rsp.rsp_data}`);
        setTimeout(() => {
          setValue2(JSON.stringify(rsp).substring(0, 40));
        }, 3000);
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

  async function getToken(){
    // await FileSystem.mkdir(FileSystem.DocumentDirectoryPath+'/logs');
      //let  dataInToken = await gAuth.GetTokenInfoAsync();
      //setValue2(JSON.stringify(dataInToken));
      //console.log(dataInToken);
    await  FirstCheck("ENG_START");
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

      <Button title="reverse" onPress={reverseValue} />
      <Button title="callback" onPress={callBackTest} />
      <Button title="promise" onPress={testPromise} />
      <Button title="sendhttpreq" onPress={sendhttp} />
      <Button title="token" onPress={getToken} />
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
    margin: 10,
    height: 20,
    borderColor: 'black',
    borderWidth: 1,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 5,
  },
});

export default App;
