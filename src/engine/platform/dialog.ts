import { open, save } from "@tauri-apps/plugin-dialog";
export async function chooseFile(title:string):Promise<string|null>{const selected=await open({multiple:false,directory:false,title});return typeof selected==="string"?selected:null;}
export async function chooseJsonSavePath(title:string,suggestedName:string):Promise<string|null>{const selected=await save({title,defaultPath:suggestedName,filters:[{name:"JSON",extensions:["json"]}]});return typeof selected==="string"?selected:null;}
export async function chooseJsonOpenPath(title:string):Promise<string|null>{const selected=await open({multiple:false,directory:false,title,filters:[{name:"JSON",extensions:["json"]}]});return typeof selected==="string"?selected:null;}
