const protocol = require('tera-data-parser');

const HELP_MESSAGES=["# HOW TO USE THE LOGGER #",
                     "Commandlist:",
                     "!logger",
                     "  - data                   : shows the data hooks in console",
                     "  - addDP [packagename]    : adds a datapackage to the data hook",
                     "  - remDP [packagename]    : removes a datapackage from the data hook",
                     "  - raw                    : shows the raw hooks in console",
                     "  - addBL [packagename]    : adds a datapackage to the raw hook blocklist",
                     "  - remBL [packagename]    : removes a datapackage from the raw hook blocklist",
                     "  - reset                  : resets the whole logger",
                     "# ============================================================================== #"];

module.exports = function Logger(dispatch){
  let RAW_HOOK=null,                        //Do not change
      RAW_HOOK_IGNORED_PACKETS=[],          //Predefine packets you want to ignore in the raw hook like ["S_SOCIAL", "C_CHAT"]
      DATA_HOOKS=[],                        //Do not change
      DATA_HOOKS_PACKETS=[];                //Predefine packets you want to look for in a event hook like ["C_CHAT", "S_SOCIAL"]
      DATA_HOOKS_RUNNING=false;
  let RAW_HOOK_HEX_OUT=false,               //If you want to turn on the hex output on the raw hook
      SAVE_ORG_DATA=false,                  //Save the data you put in above when resetting the logger? TODO: Implement the saving (Buggy)
      ORG_DATA_HOOKS_PACKETS=SAVE_ORG_DATA?DATA_HOOKS_PACKETS.slice(0):null,
      ORG_RAW_HOOK_IGNORED_PACKETS=SAVE_ORG_DATA?RAW_HOOK_IGNORED_PACKETS.slice(0):null;


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
        DATA_ADD_PACKETS:{
          ALIAS:["adddp", "adddatapackage", "adp"],
          FUNCTION:function(pkg){
            if(pkg!='') DATA_HOOKS_PACKETS.push(pkg);
            //if(DATA_HOOKS.length>0) restartDataHooks(); -- Makes no sense when data hook is running with no hooks in it
            if(DATA_HOOKS_PACKETS.length>0&&DATA_HOOKS_RUNNING)
              DATA_HOOKS[DATA_HOOKS]=hookDataHook(DATA_HOOKS_PACKETS[DATA_HOOKS_PACKETS.length-1]);
          }
        },
        DATA_REMOVE_PACKETS:{
          ALIAS:["remdp", "removedatapackage", "rdp", "deldp", "ddp"],
          FUNCTION:function(pkg){
            if(pkg!=''&&pkg!=null)
              for(let i=0; i<DATA_HOOKS_PACKETS.length; i++)
                if(DATA_HOOKS_PACKETS[i]==pkg){ DATA_HOOKS_PACKETS.splice(i, 1); i--; }
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
        RAW_ADD_BLACKLIST_PACKETS:{
          ALIAS:["addbl", "addblacklist", "abl", "ignore", "ign"],
          FUNCTION:function(pkg){
            if(pkg!='') RAW_HOOK_IGNORED_PACKETS.push(pkg)
          }
        },
        RAW_REMOVE_BLACKLIST_PACKETS:{
          ALIAS:["rembl", "removeblacklist", "rbl"],
          FUNCTION:function(pkg){
            if(pkg!=''&&pkg!=null)
              for(let i=0; i<RAW_HOOK_IGNORED_PACKETS.length; i++)
                if(RAW_HOOK_IGNORED_PACKETS[i]==pkg){ RAW_HOOK_IGNORED_PACKETS.splice(i, 1); i--; }
          }
        },
        RESET:{
          ALIAS:["reset", "restart"],
          FUNCTION:function(){
            releaseDataHooks();
            releaseRawHook();
            if(SAVE_ORG_DATA) DATA_HOOKS_PACKETS=ORG_DATA_HOOKS_PACKETS.slice(0); else DATA_HOOKS_PACKETS=[];
            if(SAVE_ORG_DATA) RAW_HOOK_IGNORED_PACKETS=ORG_RAW_HOOK_IGNORED_PACKETS.slice(0); else RAW_HOOK_IGNORED_PACKETS=[];
          }
        },
        PRINT_HELP_INGAME:{
          ALIAS:["phig", "printhelpingame", "printhelpig", "printhig"],
          FUNCTION:function(){
            for(let i=0; i<HELP_MESSAGES.length; i++)
              sendMsgToClient(HELP_MESSAGES[i]);
          }
        },
        PRINT_HELP:{
          ALIAS:["h", "help", "ph", "printhelp", "printhelp", "printh"],
          FUNCTION:function(){
            for(let i=0; i<HELP_MESSAGES.length; i++)
              console.log(HELP_MESSAGES[i]);
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
      //If second cmd is a package-remove-cmd for data
      if(LOGGER_CMDS.DATA_REMOVE_PACKETS.ALIAS.includes(secondcmd)){ LOGGER_CMDS.DATA_REMOVE_PACKETS.FUNCTION(thirdcmd); return false; }
      //If second cmd is a package-whitelist-cmd for raw
      if(LOGGER_CMDS.RAW_REMOVE_BLACKLIST_PACKETS.ALIAS.includes(secondcmd)){ LOGGER_CMDS.RAW_REMOVE_BLACKLIST_PACKETS.FUNCTION(thirdcmd); return false; }
      //If second cmd is a reset-cmd
      if(LOGGER_CMDS.RESET.ALIAS.includes(secondcmd)){ LOGGER_CMDS.RESET.FUNCTION(); return false; }
      //If second cmd is a help-ingame-cmd
      if(LOGGER_CMDS.PRINT_HELP_INGAME.ALIAS.includes(secondcmd)){ LOGGER_CMDS.PRINT_HELP_INGAME.FUNCTION(); return false; }
      //If second cmd is a help-console-cmd
      if(LOGGER_CMDS.PRINT_HELP.ALIAS.includes(secondcmd)){ LOGGER_CMDS.PRINT_HELP.FUNCTION(); return false; }
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
      if(i==0) DATA_HOOKS_RUNNING=true;
    }
  }
  function hookDataHook(hookname){
    if(hookname==''||hookname==null) return;
    DATA_HOOKS_RUNNING=true;
    return dispatch.hook(hookname, "*", event => {
      let pkgname=hookname;
      console.log(pkgname);
      console.log(event);
      console.log("");
    });
  }
  function releaseDataHooks(){
    for(let i=0; i<DATA_HOOKS.length; i++){
      dispatch.unhook(DATA_HOOKS[i]);
    }
    DATA_HOOKS=[];
    DATA_HOOKS_RUNNING=false;
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
    dispatch.toClient('S_CHAT', 1, {channel: 24, authorID: 0, unk1: 0, gm: 0, unk2: 0, authorName: '',
			message: '(ExtLogger) ' + msg
    });
  }
}
