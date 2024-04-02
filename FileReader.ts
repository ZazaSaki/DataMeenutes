
import * as fs from 'fs';

const markdownText: string = fs.readFileSync('./subject.md', { encoding: 'utf-8' });




export function readMDFile(Dir :string){
    return fs.readFileSync(Dir,{encoding:'utf-8'});

}

export function writeAnswer(Dir: string, outputName : string, data :string){
    Dir += `/${outputName}`;

    const path : string = fs.realpathSync(Dir);
    fs.writeFileSync(Dir,"data", {encoding : "utf-8"})
}



