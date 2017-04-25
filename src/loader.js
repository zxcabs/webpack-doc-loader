/**
 * @author "Evgeny Reznichenko" <kusakyky@gmail.com> 
 */
const noop = require('noop');
const parser = require('comment-parser');
const fs = require('fs');

function testTagName (tagName) {
    return ['js', 'js:hide', 'html', 'html:hide'].includes(tagName);
}

module.exports = noop;

module.exports.pitch = function(remainingRequest) {
    this.addDependency(remainingRequest);

    const isStyle = /\.(less|css)$/.test(remainingRequest);
    const context = fs.readFileSync(remainingRequest, { encoding: 'utf8' });
    const comments = parser(context);
    const withExamples = (comments || []).filter((comment) => {
        return (comment.tags || []).some(tag => tag.tag === 'example' && testTagName(tag.name));
    });

    const DEFAULT_HTML = '';

    const filesSrc = withExamples.map((comment, index) => {
        const filesObject = comment.tags.reduce((files, tag) => {
            files[tag.name] = tag.description;

            return files;
        }, {});

        const styleRequire = `require("style-loader/useable!css-loader!less-loader!${remainingRequest}")`;
        const useStile = isStyle ? `${styleRequire}.use && ${styleRequire}.use()` : '';
        const unuseStile = isStyle ? `${styleRequire}.unuse && ${styleRequire}.unuse()` : '';
        const exampleName = `example ${index + 1}`;

        return `{
            name: ${JSON.stringify(exampleName)},
            description: ${JSON.stringify(comment.description)},
            files: {
                html: ${JSON.stringify(filesObject.html || DEFAULT_HTML)},
                js: ${JSON.stringify(filesObject.js)},
                __use__() {
                    ${useStile};
                    \n
                    (function(){${filesObject['js:hide']}}());
                    \n
                    ${filesObject.js};
                 },
                 __unuse__() {
                    ${unuseStile};
                 }
            }
        }`;
    });

    return `
        module.exports = {
            file: ${JSON.stringify(remainingRequest)},
            examples: [
                ${filesSrc.join(', ')}
            ]
        };
    `;
};
