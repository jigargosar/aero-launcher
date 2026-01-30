import { XMLParser } from 'fast-xml-parser'
import { readFile } from 'fs/promises'
import { execSync } from 'child_process'

const psOutput = execSync(
    'powershell -NoProfile -Command "(Get-AppxPackage -Name Microsoft.WindowsCalculator).InstallLocation"',
    { encoding: 'utf-8' }
).trim()

const manifestPath = `${psOutput}\\AppxManifest.xml`
const xml = await readFile(manifestPath, 'utf-8')

// With @_ prefix
const parser1 = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
const result1 = parser1.parse(xml)

// Without prefix
const parser2 = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
const result2 = parser2.parse(xml)

console.log('=== WITH @_ prefix ===')
console.log(JSON.stringify(result1.Package.Identity, null, 2))

console.log('\n=== WITHOUT prefix ===')
console.log(JSON.stringify(result2.Package.Identity, null, 2))
