"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MarkdownParser = /** @class */ (function () {
    function MarkdownParser() {
    }
    MarkdownParser.prototype.parseMarkdown = function (markdownText, id = "") {
        var lines = markdownText.split('\n');
        var headings = [];
        var parentStack = [];
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            var matchHeading = line.match(/^#{1,6} (.+)/);
            var matchTags = line.match(/(?:#(\w+)|\[([^\]]+)\])/g);
            if (matchHeading) {
                var level = matchHeading[0].indexOf(' ') + 1;
                var titleWithTags = matchHeading[1].trim();
                var content = [];
                var tags = [];
                if (matchTags) {
                    for (var _a = 0, matchTags_1 = matchTags; _a < matchTags_1.length; _a++) {
                        var tagMatch = matchTags_1[_a];
                        var tag = tagMatch.replace(/^#|\[|\]/g, '');
                        tags.push(tag);
                        titleWithTags = titleWithTags.replace(tagMatch, '').trim();
                    }
                }
                var heading = { level: level, title: titleWithTags, content: content, tags: tags, children: [], id : id};
                while (parentStack.length > 0 && level <= parentStack[parentStack.length - 1].level) {
                    parentStack.pop();
                }
                if (parentStack.length > 0) {
                    parentStack[parentStack.length - 1].children.push(heading);
                }
                else {
                    headings.push(heading);
                }
                heading.parent = parentStack[parentStack.length - 1] || null;
                parentStack.push(heading);
            }
            else if (parentStack.length > 0) {
                parentStack[parentStack.length - 1].content.push(line);
            }
        }
        return headings;
    };
    return MarkdownParser;
}());

//get the list of parents of a node
function getParentHeaders(Head, List) {
    if (Head.parent && Head.parent.title) {
        
        getParentHeaders(Head.parent, List);
        List.push(Head.parent.title);
    }
    return List;
}


function printHeadingTree(heading, depth) {
    if (depth === void 0) { depth = 0; }
    console.log("".concat(' '.repeat(depth * 2)).concat(heading.title, " ").concat(heading.tags.length ? "[".concat(heading.tags.join(', '), "]") : ''));
    for (var _i = 0, _a = heading.children; _i < _a.length; _i++) {
        var child = _a[_i];
        printHeadingTree(child, depth + 1);
    }
}


//inser a topic from a parsed MD text and insert it in a dictionary
function insertInDictionary(Dict, node){
    const ParentList = getParentHeaders(node,[]);
    
    //create a pointer to iterate the dictionary
    var CurrentPoint = Dict;
    
    //search the path to insert the topic
        // search the parentpath of the path to insert the topic
        ParentList.forEach(parent => {
            
            //generate the parentpath if it doesn't exist
            if (!(parent in CurrentPoint)) {
                CurrentPoint[parent] = {"content" : []};
            }

            //find the parentpath
            CurrentPoint = CurrentPoint[parent];
        });
        

        //get the path to insert the topic form the parent path
            //generate the path if it doesn't exist
            if (!(node.title in CurrentPoint)) {
                CurrentPoint[node.title] = {"content" : []};
            }
            
            //find the path to insert
            CurrentPoint = CurrentPoint[node.title];

    //insert the topic
    CurrentPoint["content"].push({lines : node.content, id : node.id, tags : node.tags});
}


//insert a full Mark Down Tree
function insertTreeInDictionary(Dict,Tree) {
    
    //Insert Children first for eficiency
    Tree.children.forEach(child => {
        insertTreeInDictionary(Dict, child);
    });
    insertInDictionary(Dict,Tree);
}


//MDParser convert MDFile -> Dictionary
function ExtraceDictionaryFromMDFile(markdownText, Historic={}, id = "") {
    const parser = new MarkdownParser();
    const headingStructure = parser.parseMarkdown(markdownText, id);

    let Dict = Historic;

    headingStructure.forEach(head => {
        insertTreeInDictionary(Dict,head);
    });

    Dict["id"] = id;

    return Dict;
}

function nameGetter (name) {
    return {
        getObjectName: function() {
            return name
        }
    };
}

// get first apearence of a given topic
// topic : string, topic to search
// Dict : {}, Data structure
// historic: let [], list of parents [it starts as an empty local array]
// 
// return : {Object}
function getTopicFirtsApearence(topic, Dict, historic = []) {

    

    if (typeof Dict == 'object') {
        if (Dict.hasOwnProperty(topic)) {
            return Dict[topic];
        }

        for (const key in Dict) {
            const val = getTopicToList(topic,Dict[key],historic);
            if (val != null && key != "content") {
                historic.push(key);
                return val;
            }
            
        }
    }
    
    return null;
}


function getTopicToList(topic, Dict, historic = [], answer = []) {
    historic
    let done = null;
    
    if (typeof Dict == 'object') {
        
        
        for (const key in Dict) {
            historic.push(key);
            const val = getTopicToList(topic,Dict[key],historic,answer);
            if (val != null && key != "content" && typeof Dict == 'object' && val != true) {
                
                const copp = [...historic];
                answer.push({topic : val, parent: copp, name: topic, tags : Dict[key].tags});
                
                done = true;
                
            }
            historic.pop();
            
        }

        if (Dict.hasOwnProperty(topic)) {
            if (historic.length == 0) {
                answer.push({topic : Dict[topic], parent: [], name: topic, tags : Dict[topic].tags});
            }
            return Dict[topic];
        }
    }
    return done;
}


function getTagToList(tag, Dict, historic = [], answer = []) {
    historic
    let done = null;
    
    if (typeof Dict == 'object') {
        
        
        for (const key in Dict) {
            historic.push(key);
            const val = getTagToList(tag,Dict[key],historic,answer);
            if (val != null && key != "content" && typeof Dict == 'object' && val != true) {
                
                const copp = [...historic];
                answer.push({topic : val, parent: copp, name: tag, tags : Dict[key].tags});
                
                done = true;
                
            }
            historic.pop();
            
        }

        if ("content" in Dict) {
            const found = {content : Dict.content.filter(x => (x.tags.includes(tag)))};
            
            if (found.content.length > 0) {
                if (historic.length == 0) {
                    answer.push({topic : found, parent: [], name: tag, tags : ""});
                }
                return found;
            }
        }
            
    }
    return done;
}


// get the list of objects of a given topic
// topic : string, topic to search
// Dict : {}, Data structure
// historic:[], list of parents
// 
// return :[{ {Object}, [Parents of the object] }]
function getTopics(Topic, Tree) {
    let out = [];
    let list = []
    const ans = getTopicToList(Topic, Tree, list, out);
    return [...out];
}

// get the list of objects of a given topic
// topic : string, topic to search
// Dict : {}, Data structure
// historic:[], list of parents
// 
// return :[{ {Object}, [Parents of the object] }]
function getTags(Topic, Tree) {
    let out = [];
    let list = []
    const ans = getTagToList(Topic, Tree, list, out);
    return [...out];
}


function convertTopicToMD(Topic) {
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

        content.lines.forEach(line => {
            str = `${str}${line}\n`
        });
    });

    return str;
}

/*
// Example usage:
var markdownText = `
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

markdownText = `# Eq1
matias, anibla, mafalda
## proj

nada a relatar


# Eq2
tibursio, josé, matumba


## proj 
um em andamento

### Finance #problem
necessidade de 300€€

# Eq1
## porj #problem
problema com pessoal

## Staff
	necessidade de encontrar mão de obra

`;

var tree = ExtraceDictionaryFromMDFile(markdownText, {}, "2024-03-26");
let list = [];
let out = [];
const ans = getTopics("Introduction", tree);
const ansb = getTopics("Finance", tree);

tree = ExtraceDictionaryFromMDFile(markdownText, tree, "nelson");
const ansc = getTopics("Eq1", tree);

const ansd = getTags("problem", tree);
const str = convertTopicToMD(ansd[0]);

ansd.forEach(element => {
    console.log(convertTopicToMD(element));
});

console.log();
//*/
