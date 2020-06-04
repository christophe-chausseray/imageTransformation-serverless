const im = require('imagemagick');
const fs = require('fs');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
    const operation = event.queryStringParameters ? event.queryStringParameters.operation : null;
    let data = JSON.parse(event.body);
    
    switch (operation) {
        case 'ping':
            sendRes(200, 'pong');
            break;
        case 'convert':
            return await operate(data);
        default:
            return sendRes(401, `Unrecognized operation ${operation}`);
    }
};

const sendRes = (status, body) => {
    console.log(status);
    return {
        statusCode: status,
        headers: {
            "Content-type": "text/html"
        },
        body: body
    };
}

const operate = async (data) => {
    const customArgs = data.customArgs.split(',') || [];
    let outputExtension = 'png';
    let inputFile = null, outputFile = null;
    
    try {
        if (data.base64Image) {
            inputFile = '/tmp/inputFile.png';
            const buffer = new Buffer(data.base64Image, 'base64');
            fs.writeFileSync(inputFile, buffer);
            customArgs.unshift(inputFile);
        }
        
        outputFile = `/tmp/outputFile.${outputExtension}`;
        customArgs.push(outputFile);
        
        await performConvert(customArgs);
        let fileBuffer = new Buffer(fs.readFileSync(outputFile));
        fs.unlinkSync(outputFile);
        
        await saveFile(fileBuffer);
        return sendRes(200, `<img src="data:image/png;base64,${fileBuffer.toString('base64')}"/>`);
    } catch (error) {
        return sendRes(500, error);
    }
}

const performConvert = (params) => {
    return new Promise((resolve, reject) => {
        im.convert(params, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve('Operation completed succesfully');
            }
        })
    });
}

const saveFile = async (buffer) => {
    const params = {
      Bucket: 'imagetransformation',
      Key: `images/${Date.now().toString()}.png`,
      Body: buffer
    };
    
    return await s3.putObject(params).promise();
}
