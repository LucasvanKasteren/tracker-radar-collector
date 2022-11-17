const puppeteer = require('puppeteer');
const BaseCollector = require('./BaseCollector');


class DOMChangeCollector extends BaseCollector{

    id() {
        return 'domchange';
    }
    /**
     * @param {import('./BaseCollector').CollectorInitOptions} options
     */
    init({log, url}) {
        console.log("Init function");
        /**
         * @type {any[]}
         */
        this._insertedNodes = [];
    }


     /**
     * @param {{cdpClient: import('puppeteer').CDPSession, url: string, type: import('./TargetCollector').TargetType,}} targetInfo 
     */
    async addTarget({cdpClient, url, type}) {
        console.log('Start of target function');
        await cdpClient.send('Page.enable');
        await cdpClient.send('DOM.enable');
        const SOURCE_STRING = `
        const fillInputFields = function(fields){
            for(const field of fields){
                fillInputField(field);
            }
        };
        
        const fillInputField = function(/** @type {HTMLInputElement} */ field){
            //check type and fill accordingly
            console.log("Field value: ", field);
            console.log("Field : ", field.id);
            if(field.type == 'email' && field.tagName != 'form'){
                field.value = 'hello@gmail.com';
                console.log('Email field filled!');
            }
            else if (field.type == 'password'  && field.tagName != 'form'){
                field.value = 'world';
                console.log('Password field filled!');
            }
            else{
                console.log('No email or password fields to fill');
            }
        };
      
        var testList = []; const observeTargets = function(){
            console.log("Get target node");
            // Specify root document node as target node to observe full page
            const targetNode = window.document.documentElement;
            const config = {attributes:true, childList: true, subtree:true};
            console.log("Before callback");
            const callback = function(/** @type {MutationRecord[]} */ mutationList, /** @type {MutationObserver} */ observer){
                console.log("Enter callback");
                mutationList.forEach( function(mutation){
                    console.log("Enter mutationList");
                    for(var i=0; i<mutation.addedNodes.length; i++){
                        console.log("Mutation type: " + mutation.type);
                        console.log("Mutation target: " + mutation.target.nodeName);
                        console.log("Mutation name: " + mutation.addedNodes[i].nodeName);

                        if(mutation.addedNodes[i].nodeName == "#text" || mutation.addedNodes[i].nodeName == "#comment" ){
                            continue;
                        }
                        // @ts-ignore
                        var forms = mutation.addedNodes[i].querySelectorAll('form, input');
                        
                        if (forms.length == 0){
                            continue;
                        }
                        // Add mutations to list and print them 
                        console.log("Mutation which will be added to list: ", mutation.addedNodes[i]);
                        console.log("Forms: ", forms);
                        console.log("Length forms: ", forms.length);                      
                        
                        console.log("Mutation inserted nodes: ", forms[i].outerHTML);
                        console.log("Before adding to testList:", testList);
                        console.log("Length of testList ", testList.length);
                        testList.push(forms[i].outerHTML);
                        //testList.push(forms[i]);                    
                        console.log("After adding to testList:", testList);
                        setTimeout(fillInputFields,2000, forms);
                    }

                });

            };
            
            const observer = new MutationObserver(callback);
            // Start observing target node	
            observer.observe(targetNode,config);         
        };
         

        
        window.addEventListener('DOMContentLoaded', (event) => {
            observeTargets();
        });        
        `;
        await cdpClient.send('Page.addScriptToEvaluateOnNewDocument', {source: SOURCE_STRING}); 
        await cdpClient.send('Page.addScriptToEvaluateOnNewDocument', {source: `console.log("INJECTED SCRIPT")`});

        console.log('End of target function');
    }

    /**
     * @param {Options} options
     */
    async getData(options) { 
        console.log("getData function");
        this._options = options;
        this.page = options.page;
        //console.log("Page:", this.page);
        this.finalUrl = options.finalUrl;
        var result = await this.page.evaluate(`testList`);
        //console.log("Page evaluation: ", result);
        this._insertedNodes.push(result);
        return this._insertedNodes;    
    }

}

//npm run crawl -- -u "https://output.jsbin.com/levuwoc" -o ./test_pages_2/ -f -v -d requests,targets,cookies,screenshots,apis,domchange 


module.exports = DOMChangeCollector


/**
 * @typedef {number} NodeId
 */

/**
 * @typedef Options
 * @property {string} finalUrl
 * @property {function(string):boolean} urlFilter?
 * @property {puppeteer.Page} page
 * @property {string} outputPath
 * @property {puppeteer.BrowserContext} context
 */

/**
 * @typedef NodeData
 * @property {Node} node
 * 
 */