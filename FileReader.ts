import * as fs from 'fs';

export function readMDFile(Dir :string){
    let path : string = fs.realpathSync(Dir);
    return fs.readFileSync(path,{encoding:'utf-8'});

}

export function writeAnswer(Dir: string, outputName : string, data :string){
    Dir += `/${outputName}`;

    const path : string = fs.realpathSync(Dir);
    fs.writeFileSync(Dir,data, {encoding : "utf-8"})
}
