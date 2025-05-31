const fs = require('fs');
const axios = require('axios');
const path = require('path');

class LayerEdgeChecker {
    constructor() {
        this.baseUrl = 'https://airdrop.layeredge.foundation/api/eligibility';
        this.headers = {
            "accept": "application/json, text/plain, */*",
            "clq-app-id": "layeredge",
            "request-id": "|8e4ad3a340174ab79a35743704ad84d8.39aaa2397c1f467a",
            "sec-ch-ua": "\"Brave\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "traceparent": "00-8e4ad3a340174ab79a35743704ad84d8-39aaa2397c1f467a-01",
            "Referer": "https://airdrop.layeredge.foundation/flow",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        };
        this.delay = 1000; 
    }

    loadAddresses() {
        try {
            const filePath = path.join(__dirname, 'address.txt');
            let data = fs.readFileSync(filePath, 'utf8');
            
            console.log('📂 Reading address.txt...');

            const addresses = data
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && line.startsWith('0x') && line.length === 42);
            
            if (addresses.length === 0) {
                throw new Error('No valid addresses found in file');
            }
            
            console.log(`✅ Successfully loaded ${addresses.length} addresses`);
            return addresses;
            
        } catch (error) {
            console.error('❌ Error reading address.txt:', error.message);
            console.log('\n📋 Correct format (one address per line):');
            console.log('0x4D9e74F39866cDFd9F6EB51C31326e2Cf7E55881');
            console.log('0xAnotherAddress...');
            console.log('0xYetAnotherAddress...');
            process.exit(1);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkAddress(address) {
        try {
            const url = `${this.baseUrl}?address=${address}`;
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 10000 
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    formatResult(address, result, index) {
        const header = `\n[${index + 1}] Address: ${address}`;
        
        if (!result.success) {
            return `${header}\n❌ Error: ${JSON.stringify(result.error)}`;
        }

        const { allocation, initAllocation, proof, details } = result.data;
        
        if (allocation && parseFloat(allocation) > 0) {
            return `${header}\n✅ ELIGIBLE - Allocation: ${allocation} tokens (Initial: ${initAllocation})\n📋 Details: ${JSON.stringify(details)}\n🔐 Proof Length: ${proof?.length || 0} items`;
        } else {
            return `${header}\n❌ NOT ELIGIBLE - No allocation found`;
        }
    }

    saveResults(results) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `layeredge_results_${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify(results, null, 2));
            console.log(`\n💾 Results saved to file: ${filename}`);
        } catch (error) {
            console.error('❌ Error saving file:', error.message);
        }
    }

    async run() {
        console.log('Starting LayerEdge Airdrop Checker - Airdrop Insiders\n');
        
        const addresses = this.loadAddresses();
        console.log(`📋 Loaded ${addresses.length} addresses\n`);

        const results = [];
        let eligibleCount = 0;
        let totalAllocation = 0;

        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];
            
            console.log(`⏳ Checking ${i + 1}/${addresses.length}: ${address}`);
            
            const result = await this.checkAddress(address);
            const formattedResult = this.formatResult(address, result, i);
            
            console.log(formattedResult);

            const resultData = {
                index: i + 1,
                address: address,
                success: result.success,
                ...result.data,
                error: result.error || null
            };
            
            results.push(resultData);

            if (result.success && result.data.allocation && parseFloat(result.data.allocation) > 0) {
                eligibleCount++;
                totalAllocation += parseFloat(result.data.allocation);
            }

            if (i < addresses.length - 1) {
                await this.sleep(this.delay);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 SUMMARY RESULTS');
        console.log('='.repeat(50));
        console.log(`Total Addresses: ${addresses.length}`);
        console.log(`Eligible Addresses: ${eligibleCount}`);
        console.log(`Not Eligible: ${addresses.length - eligibleCount}`);
        console.log(`Total Allocation: ${totalAllocation.toFixed(2)} tokens`);
        console.log(`Success Rate: ${((eligibleCount / addresses.length) * 100).toFixed(2)}%`);

        this.saveResults(results);
        
        console.log('\n✅ Checker completed!');
    }
}

const checker = new LayerEdgeChecker();
checker.run().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});