const puppeteer = require('puppeteer');
const BaseCollector = require('./BaseCollector');


class MutationsCollector extends BaseCollector{

    id() {
        return 'mutations';
    }
    /**
     * @param {import('./BaseCollector').CollectorInitOptions} options
     */
    init({log, url}) {
        /**
         * @type {any[]}
         */
        this._insertedNodes = [];
    }


     /**
     * @param {{cdpClient: import('puppeteer').CDPSession, url: string, type: import('./TargetCollector').TargetType,}} targetInfo 
     */
    async addTarget({cdpClient, url, type}) {
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
                field.value = 'inputdetector@gmail.com';
            }
            else if (field.type == 'password'  && field.tagName != 'form'){
                field.value = 'myPwd1234';
            }
            else{
                console.log('No email or password fields to fill');
            }
        };
      
        var resultList = []; const observeTargets = function(){
            // Specify root document node as target node to observe full page
            const targetNode = window.document.documentElement;
            const config = {attributes:true, childList: true, subtree:true};
            const callback = function(/** @type {MutationRecord[]} */ mutationList, /** @type {MutationObserver} */ observer){
                mutationList.forEach( function(mutation){
                    for(var i=0; i<mutation.addedNodes.length; i++){

                        if(mutation.addedNodes[i].nodeName == "#text" || mutation.addedNodes[i].nodeName == "#comment" ){
                            continue;
                        }
                        // @ts-ignore
                        var forms = mutation.addedNodes[i].querySelectorAll('form, input');
                        
                        if (forms.length == 0){
                            continue;
                        }
                        var elemDimension = forms[i].getBoundingClientRect();
                        var parentFormAction = forms[i].form.action;
                        //Push the mutation to the result list together with its position and action
                        resultList.push(forms[i].outerHTML, ("Form element width: " + elemDimension.width), ("Form element heigth: " + elemDimension.height), parentFormAction);
                        //Call the function to fill the input fields
                        setTimeout(fillInputFields,1000, forms);
                    }

                });

            };
            //Create the MutationObserver object to initiate callback
            const observer = new MutationObserver(callback);
            // Start observing target node	
            observer.observe(targetNode,config);         
        };
         

        //Start observering targets when the whole DOM content has been loaded
        window.addEventListener('DOMContentLoaded', (event) => {
            observeTargets();
        });        
        `;
        await cdpClient.send('Page.addScriptToEvaluateOnNewDocument', {source: `console.log("INJECTED SCRIPT")`}); 
        await cdpClient.send('Page.addScriptToEvaluateOnNewDocument', {source: SOURCE_STRING}); 

    }

    /**
     * @param {Options} options
     */
    async getData(options) { 
        this._options = options;
        this.page = options.page;
        this.finalUrl = options.finalUrl;
        var result = await this.page.evaluate(`resultList`);
        this._insertedNodes.push(result);
        return this._insertedNodes;    
    }

}

//npm run crawl -- -u "https://output.jsbin.com/levuwoc" -o ./test_pages/ -f -v -d targets,requests,apis,domchange 
//npm run crawl -- -i C:\Users\lvank\Documents\Radboud-Universiteit\Studiejaar-3\Thesis-2\TrancoTop75.txt -o ./trancotop10-test/ -f -v -d targets,requests,apis,domchange

module.exports = MutationsCollector


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