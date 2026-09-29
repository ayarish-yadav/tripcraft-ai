import {cpSync,mkdirSync,rmSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true});
mkdirSync('dist',{recursive:true});
cpSync('client/dist','dist',{recursive:true});
