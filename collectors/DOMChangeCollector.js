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
            if(field.type == 'email' && field.tagName != 'form'){
                field.value = 'hello@gmail.com';
            }
            else if (field.type == 'password'  && field.tagName != 'form'){
                field.value = 'myPwd1234';
            }
            else{
                console.log('No email or password fields to fill');
            }
        };
      
        var testList = []; const observeTargets = function(){
            // Specify root document node as target node to observe full page
            const targetNode = window.document.documentElement;
            const config = {attributes:true, childList: true, subtree:true};
            const callback = function(/** @type {MutationRecord[]} */ mutationList, /** @type {MutationObserver} */ observer){
                mutationList.forEach( function(mutation){
                    console.log("Enter mutationList");
                    for(var i=0; i<mutation.addedNodes.length; i++){

                        if(mutation.addedNodes[i].nodeName == "#text" || mutation.addedNodes[i].nodeName == "#comment" ){
                            continue;
                        }
                        // @ts-ignore
                        var forms = mutation.addedNodes[i].querySelectorAll('form, input');
                        
                        if (forms.length == 0){
                            continue;
                        }
                        testList.push(forms[i].outerHTML);
                        //testList.push(forms[i]);                    
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
//npm run crawl -- -i C:\Users\lvank\Documents\Radboud-Universiteit\Studiejaar-3\Thesis-2\TrancoTop75.txt -o ./trancotop10-test/ -f -v -d targets,requests,apis,domchange

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