var {spawn} = require('child_process');
var javalon = require('javalon')
javalon.init({api: 'https://avalon.d.tube'})
let delay = 2800


class AvalonWatcher {
    constructor(address) {
        console.log('Watching '+address+'@avalon')
        this.address = address
    }

    async checkBlock(number) {
        javalon.getBlock(number, function(err, block) {
            if (err || !block) {
                setTimeout(function() {DTCWatcher.checkBlock(number)}, delay)
                return
            }

            headblocks.avalon = number
            fs.writeFileSync('./headblocks.js', "module.exports={eth:"+headblocks.eth+",avalon:"+headblocks.avalon+"}")            

            let secondsAgo = Math.round((new Date().getTime() - block.timestamp)/1000)
            let transactions = block.txs;
            if (number%config.blocksDisplay === 0)
                console.log('Avalon Block #'+number+' '+secondsAgo+'s ago');
            if (block.txs != null && block.txs.length > 0) {
                for (let i = 0; i < block.txs.length; i++) {
                    let tx = block.txs[i]
                    if (tx.type === 3 && tx.data.receiver === DTCWatcher.address) {
                        let amount = tx.data.amount
                        let memo = tx.data.memo
                        console.log('transfer', tx.sender, amount, memo)
                        if (!memo) {
                            console.log('Error, tx without memo')
                            continue
                        }
                        let memoParsed = memo.split('@')
                        if (memoParsed.length !== 2) {
                            console.log('Error, memo invalid')
                            continue
                        }
                        let destinationNetwork = memoParsed[1]
                        let destinationAddress = memoParsed[0]

                        if (destinationNetwork !== 'eth') {
                            console.log('Error, network is not ethereum')
                            continue
                        }
                        
                        try {
                            console.log('=== BEGIN SEND-TX ===')
                            var cmd = "oz send-tx --to "+config.ethContractAddress+" --method mint --args "+destinationAddress+","+amount+" -n kovan --no-interactive"
                            var mintWdtc = spawn('npx', cmd.split(' '));     
                            mintWdtc.stderr.on('data', (data) => {
                                console.error(data.toString());
                            });
                            mintWdtc.on('close', (code) => {
                                console.log(`=== END SEND-TX: ${code} ===`);
                            });
                        } catch (error) {
                            console.log(error)
                        }
                        
                    }
                }
            }
            setTimeout(function() {DTCWatcher.checkBlock(1+number)}, 1)
        })
    }
}

module.exports = AvalonWatcher