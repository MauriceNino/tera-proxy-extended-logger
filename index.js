const protocol = require('tera-data-parser');
/*
Desc: This program is designed to find packages and spy on them for programming purposes
-> First you look for the raw package(s)
-> When you found your package(s), you spy on them with event hooks

Features:
-> Everything controlable through the tera C_CHAT
-> Easy customizable commands, aliases and functions
-> Good errorhandling

How to use:
-> Call "!logger raw" or synonyms like "!l r" to get all the raw packets
-> Call "!logger ignore S_SOCIAL" or synonyms like "!l ign S_SOCIAL" to blacklist those packets from the raw logger
-> Call "!logger data" or synonyms like "!l d" to get all event hooks (empty at the beginning)
-> Call "!logger addDatapackage S_SOCIAL" or synonyms like "!l adp S_SOCIAL" to add a package to the event hooks
-> Call "!logger reset" to reset the current session and start again

Disclaimer:
You can contact me on discord with the username "MauriceNino#1098" or per email on "mauriceprivat98@gmail.com"
You can use this project however you want. i dont care
Ty Pinkie for the raw hook <3

*/
module.exports = function Logger(dispatch){
  let RAW_HOOK=null,                        //Do not change
      RAW_HOOK_IGNORED_PACKETS=[],          //Predefine packets you want to ignore in the raw hook like ["S_SOCIAL", "C_CHAT"]
      DATA_HOOKS=[],                        //Do not change
      DATA_HOOKS_PACKETS=[];                //Predefine packets you want to look for in a event hook like ["C_CHAT", "S_SOCIAL"]
  let RAW_HOOK_HEX_OUT=false,               //If you want to turn on the hex output on the raw hook
      ORG_DATA_HOOKS_PACKETS=DATA_HOOKS_PACKETS.splice(),
      ORG_RAW_HOOK_IGNORED_PACKETS=RAW_HOOK_IGNORED_PACKETS.splice();

  //All chat commands with alias and predefined function
  let LOGGER_CMDS={
        MAIN_CMD:{
          PREFIX:"!",
          ALIAS:["logger", "l", "log"],
          FUNCTION:function(){
            sendMsgToClient("Usage: !logger [data/raw/addDP/addBL] [DP/BL]");
          }
        },
        DATA:{
          ALIAS:["data", "d", "-d"],
          FUNCTION:function(){
            releaseRawHook();
            hookDataHooks();
            sendMsgToClient("Data Hook started (Type '!l addDP [package]') to add a Data package to observe");
          }
        },
        RAW:{
          ALIAS:["raw", "r", "-r"],
          FUNCTION:function(){
            releaseDataHooks();
            hookRawHook();
            sendMsgToClient("Raw Hook started (Type '!l addBL [package]') to add a Blacklist package");
          }
        },
        DATA_ADD_PACKETS:{
          ALIAS:["adddp", "adddatapackage", "adp"],
          FUNCTION:function(pkg){
            if(pkg!='') DATA_HOOKS_PACKETS.push(pkg);
            if(DATA_HOOKS.length>0) restartDataHooks();
          }
        },
        RAW_ADD_BLACKLIST_PACKETS:{
          ALIAS:["addbl", "addblacklist", "abl", "ignore", "ign"],
          FUNCTION:function(pkg){
            if(pkg!='') RAW_HOOK_IGNORED_PACKETS.push(pkg)
          }
        },
        RESET:{
          ALIAS:["reset", "restart"],
          FUNCTION:function(){
            releaseDataHooks();
            releaseRawHook();
            DATA_HOOKS_PACKETS=ORG_DATA_HOOKS_PACKETS.splice();
            RAW_HOOK_IGNORED_PACKETS=ORG_RAW_HOOK_IGNORED_PACKETS.splice();
          }
        }
      };

  //Chat cmd hook
  dispatch.hook("C_CHAT", 1, event=>{
    let message=event.message.substring(event.message.indexOf("<FONT>")+("<FONT>".length),event.message.indexOf("</FONT>")),
        splitmessage=message.split(' '),
        firstcmd=typeof splitmessage[0]==='undefined'?'':splitmessage[0].toLowerCase();

    if(LOGGER_CMDS.MAIN_CMD.ALIAS.includes(firstcmd.substring(firstcmd.indexOf(LOGGER_CMDS.MAIN_CMD.PREFIX)+1, firstcmd.length))){
      let secondcmd=typeof splitmessage[1]==='undefined'?'':splitmessage[1].toLowerCase();
      //If no second cmd gets sent
      if(secondcmd==''){ LOGGER_CMDS.MAIN_CMD.FUNCTION(); return false; }
      let thirdcmd=typeof splitmessage[2]==='undefined'?'':splitmessage[2].toUpperCase();

      //If second cmd is a data-cmd
      if(LOGGER_CMDS.DATA.ALIAS.includes(secondcmd)){ LOGGER_CMDS.DATA.FUNCTION(); return false; }
      //If second cmd is a raw-cmd
      if(LOGGER_CMDS.RAW.ALIAS.includes(secondcmd)){ LOGGER_CMDS.RAW.FUNCTION(); return false; }
      //If second cmd is a package-add-cmd for data
      if(LOGGER_CMDS.DATA_ADD_PACKETS.ALIAS.includes(secondcmd)){ LOGGER_CMDS.DATA_ADD_PACKETS.FUNCTION(thirdcmd); return false; }
      //If second cmd is a package-ignore-cmd for raw
      if(LOGGER_CMDS.RAW_ADD_BLACKLIST_PACKETS.ALIAS.includes(secondcmd)){ LOGGER_CMDS.RAW_ADD_BLACKLIST_PACKETS.FUNCTION(thirdcmd); return false; }
      //If second cmd is a reset-cmd
      if(LOGGER_CMDS.RESET.ALIAS.includes(secondcmd)){ LOGGER_CMDS.RESET.FUNCTION(); return false; }
    }
  });
  function hookDataHooks(){
    for(let i=0; i<DATA_HOOKS_PACKETS.length; i++){
      try{
        DATA_HOOKS[i]=dispatch.hook(DATA_HOOKS_PACKETS[i], "*", event => {
          let pkgname=DATA_HOOKS_PACKETS[i];
          console.log(pkgname);
          console.log(event);
          console.log("");
        });
      }catch(e){
        console.log("Invalid Hookname '"+DATA_HOOKS_PACKETS[i]+"'");
      }
    }
  }
  function releaseDataHooks(){
    for(let i=0; i<DATA_HOOKS.length; i++){
      dispatch.unhook(DATA_HOOKS[i]);
    }
    DATA_HOOKS=[];
  }
  function restartDataHooks(){
    releaseDataHooks();
    hookDataHooks();
  }
  function hookRawHook(){
    // @Pinkie - Raw Hook
    RAW_HOOK=dispatch.hook('*', 'raw', {order: -999}, (code, data, fromServer) => {
      let packetName=dispatch.base.protocolMap.code.get(code);

      if(!RAW_HOOK_IGNORED_PACKETS.includes(packetName)) console.log(fromServer ? '<-' : '->', packetName, RAW_HOOK_HEX_OUT?data.toString('hex'):"");
    });
  }
  function releaseRawHook(){
    if(RAW_HOOK==null) return;
    dispatch.unhook(RAW_HOOK);
    RAW_HOOK=null;
  }
  function sendMsgToClient(msg){
    dispatch.toClient('S_CHAT', 1, {
			channel: 24,
			authorID: 0,
			unk1: 0,
			gm: 0,
			unk2: 0,
			authorName: '',
			message: '(ExtLogger) ' + msg
    });
  }
}
