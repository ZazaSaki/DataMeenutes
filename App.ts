import { readMDFile } from "./FileReader";

const reservedWords: string[] = ['tags', 'content'];
class MarkdownParser {
    

    parseMarkdown(markdownText: string, id: string = ""): Heading[] {
        const lines = markdownText.split('\n');
        const headings: Heading[] = [];
        const parentStack: Heading[] = [];
        
        for (const line of lines) {
            const matchHeading = line.match(/^#{1,6} (.+)/);
            const matchTags = line.match(/(?:#(\w+)|\[([^\]]+)\])/g);
            
            if (matchHeading) {
                const level = matchHeading[0].indexOf(' ') + 1;
                let titleWithTags = matchHeading[1].trim();
                const content: string[] = [];
                const tags: string[] = [];
                
                if (matchTags) {
                    for (const tagMatch of matchTags) {
                        const tag = tagMatch.replace(/^#|\[|\]/g, '');
                        tags.push(tag);
                        titleWithTags = titleWithTags.replace(tagMatch, '').trim();
                    }
                }
                
                const heading: Heading = { level, title: titleWithTags, content, tags, children: [], id };
                
                while (parentStack.length > 0 && level <= parentStack[parentStack.length - 1].level) {
                    parentStack.pop();
                }
                
                if (parentStack.length > 0) {
                    parentStack[parentStack.length - 1].children.push(heading);
                } else {
                    headings.push(heading);
                }
                
                heading.parent = parentStack[parentStack.length - 1] || null;
                parentStack.push(heading);
            } else if (parentStack.length > 0) {
                parentStack[parentStack.length - 1].content.push(line);
            }
        }
        
        return headings;
    }

    getParentHeaders(Head: Heading, List: string[] = []): string[] {
        if (Head.parent && Head.parent.title) {
            this.getParentHeaders(Head.parent, List);
            List.push(Head.parent.title);
        }
        return List;
    }

    printHeadingTree(heading: Heading, depth: number = 0) {
        console.log(`${' '.repeat(depth * 2)}${heading.title} ${heading.tags.length ? `[${heading.tags.join(', ')}]` : ''}`);
        for (const child of heading.children) {
            this.printHeadingTree(child, depth + 1);
        }
    }

    insertInDictionary(Dict: any, node: Heading) {
        const ParentList = this.getParentHeaders(node, []);
        let CurrentPoint = Dict;
        
        ParentList.forEach(parent => {
            if (!(parent in CurrentPoint)) {
                CurrentPoint[parent] = { "content": [] };
            }
            CurrentPoint = CurrentPoint[parent];
        });
        
        if (!(node.title in CurrentPoint)) {
            CurrentPoint[node.title] = { "content": [] };
        }
        
        CurrentPoint = CurrentPoint[node.title];
        CurrentPoint["content"].push({ lines: node.content, id: node.id, tags: node.tags });
    }

    insertTreeInDictionary(Dict: any, Tree: Heading) {
        Tree.children.forEach(child => {
            this.insertTreeInDictionary(Dict, child);
        });
        this.insertInDictionary(Dict, Tree);
    }

    extractDictionaryFromMDFile(markdownText: string, Historic: any = {}, id: string = "") {
        const headingStructure = this.parseMarkdown(markdownText, id);
        let Dict = Historic;

        headingStructure.forEach(head => {
            this.insertTreeInDictionary(Dict, head);
        });

        Dict["id"] = id;
        return Dict;
    }

    getTopicFirstAppearance(topic: string, Dict: any, historic: string[] = []) {
        if (typeof Dict == 'object') {
            if (Dict.hasOwnProperty(topic)) {
                return Dict[topic];
            }

            for (const key in Dict) {
                const val = this.getTopicToList(topic, Dict[key], historic);
                if (val != null && key != "content") {
                    historic.push(key);
                    return val;
                }
            }
        }
        
        return null;
    }

    getTagsFromHeading(Head : any){
        let tags: string[] = [];
                Head.content.map(x => (x.tags)).forEach(tagList => {
                    tagList.forEach(tag => {
                        if (!tags.includes(tag)) {
                            tags.push(tag);
                        } 
                    }); 
                });
        return tags;
    }

    getTopicToList(topic: string, Dict: any, historic: string[] = [], answer: any[] = []) {
        let done = null;
        
        if (typeof Dict == 'object') {
            for (const key in Dict) {
                historic.push(key);
                const val = this.getTopicToList(topic, Dict[key], historic, answer);
                if (val != null && key != "content" && typeof Dict == 'object' && val != true) {
                    const copp = [...historic];
                    answer.push({ topic: val, parent: copp, name: topic, tags: val.tags });
                    done = true;
                }
                historic.pop();
            }

            if (Dict.hasOwnProperty(topic)) {
                let tags: string[] = this.getTagsFromHeading(Dict[topic]);

                if (historic.length == 0) {
                    answer.push({ topic: Dict[topic], parent: [], name: topic, tags: tags });
                }
                return Dict[topic];
            }
        }
        return done;
    }

    getTagToList(tag: string, Dict: any, historic: string[] = [], answer: any[] = []) {
        let done = null;
        
        if (typeof Dict == 'object') {
            for (const key in Dict) {
                historic.push(key);
                const val = this.getTagToList(tag, Dict[key], historic, answer);
                if (val != null && key != "content" && typeof Dict == 'object' && val != true) {
                    const copp = [...historic];
                    answer.push({ topic: val, parent: copp, name: tag, tags: val.tags });
                    done = true;
                }
                historic.pop();
            }

            if ("content" in Dict) {
                const found = { content: Dict.content.filter(x => (x.tags.includes(tag))) };
                let tags = [];
                found.content.map(x => (x.tags)).forEach(tagList => {
                    tagList.forEach(tag => {
                        if (!tags.includes(tag)) {
                            tags.push(tag);
                        } 
                    }); 
                });
                if (found.content.length > 0) {
                    if (historic.length == 0) {
                        answer.push({ topic: found, parent: [], name: tag, tags: tags });
                    }
                    found["tags"] = tags;
                    return found;
                }
            }
                
        }
        return done;
    }

    getTopics(Topic: string, Tree: any, full:boolean = false) {
        let out = [];
        let list = [];
        const ans = this.getTopicToList(Topic, Tree, list, out);

        if (out.length == 1 && full) {
            let subTree : any = Tree;
            
            for (let index = 0; index < out[0].parent.length; index++) {
                const element = out[0].parent[index];
                subTree = Tree[element];
            }
            
            subTree = subTree[Topic];

            Object.keys(subTree).forEach((child)=>{
                if (!(reservedWords.includes(child))) {
                    let subOut = [];
                    let subList = [];
                    // const subAns = this.getTopicToList(child, subTree, subList, subOut);
                    // out  = [...out, ...subOut];
                    out.push({ topic: subTree[child], parent: [], name: child, tags: this.getTagsFromHeading(subTree[child]) });
                }
                
            });
        }

        return [...out];
    }

    getOrganizedTopics(Topics: string, Tree: any, full : boolean = false) {
        return this.organizeInChronologicOrder(this.getTopics(Topics, Tree, full));
    }

    getTags(Topic: string, Tree: any) {
        let out = [];
        let list = [];
        const ans = this.getTagToList(Topic, Tree, list, out);
        return [...out];
    }

    getOrganizedTags(Topics: string, Tree: any) {
        return this.organizeInChronologicOrder(this.getTags(Topics, Tree));
    }

    organizeInChronologicOrder(Topics: any[]): any[] {
        let out: any[] = [];
        Topics.map(Topic => {
            Topic.topic.content.map((element: any) => {
                out.push({
                    content: element.lines, 
                    parent: Topic.parent, 
                    tags: element.tags, 
                    id: element.id, 
                    name: Topic.name 
                });
            });
        });
        
        out = out.sort((a, b) => parseInt(a.parent.length as string) - parseInt(b.parent.length as string));
        out = out.sort((a, b) => {
            const idA = typeof a.id === 'number' ? a.id : Date.parse(a.id);
            const idB = typeof b.id === 'number' ? b.id : Date.parse(b.id);
            return idB - idA;
        });
        
        return out;


    }
    

    convertOrganizedTopicToMD(Topics: any[]): string {
        let str = ``;
        Topics.forEach(Topic => {
            str = `${str}# `;
            
            Topic["parent"].forEach((parent: string) =>{ // Add type annotation here
                str = `${str}${parent}/`
            });
    
            str = `${str}${Topic.name}\n`;
    
            str = `${str}## ${Topic.id}\n`
    
            Topic.tags.forEach((tag: string) => { // Add type annotation here
                str = `${str}#${tag} `;
            });
            
            str += '\n';
            Topic.content.forEach((line: string) => { // Add type annotation here
                str = `${str}${line}\n`
            });
        });
        return str;
    }
    

    convertTopicToMD(Topic: any) {
        if (typeof Topic != 'object') {
            return '';
        }
        
        let str = `# `;
        
        Topic["parent"].forEach(parent =>{
            str = `${str}${parent}/`
        });

        str = `${str}${Topic.name}\n`;

        
        Topic["topic"]["content"].forEach(content =>{
            str = `${str}## ${content.id}\n`
            content.tags.forEach(tag => {
                str = `${str}#${tag} `;
            });
                str += '\n';
            content.lines.forEach(line => {
                str = `${str}${line}\n`
            });
        });

        return str;
    }
}

interface Heading {
    level: number;
    title: string;
    content: string[];
    tags: string[];
    children: Heading[];
    parent?: Heading | null;
    id: string;
}


///*
// Example usage:
const parser = new MarkdownParser();

let markdownText = `
# Introduction #markdown #parser [introduction]

This is an introduction to Markdown parsing.

## About Markdown [about]

Markdown is a lightweight markup language.

### History [history]

It was created by John Gruber.

#### Usage

## Usage [usage]

Markdown is commonly used for writing documentation.

# Examples [examples]

Here are some examples of Markdown syntax:

## Lists [lists]

- Item 1
- Item 2

# Introduction
    More text here

## Other topic
    More on the topic
### Usage
    use case sensitive
`;

markdownText = readMDFile('./subject.md');


const headingStructure = parser.extractDictionaryFromMDFile(markdownText, {}, "2024-03-26");
const headingStructure2 = parser.extractDictionaryFromMDFile(markdownText, headingStructure, "2024-03-30");
const tttt = parser.getOrganizedTopics("Aveiro", headingStructure, true);
console.log(parser.convertOrganizedTopicToMD(tttt));
//import {readMDFileYeaa}from './FileRader.js';

console.log()
//*/