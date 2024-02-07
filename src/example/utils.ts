import { PortableDid, DidDhtMethod } from '@web5/dids'
import fs from 'fs/promises'


export async function createOrLoadDid(filename: string): Promise<PortableDid> {

  // Check if the file exists
  try {
    const data = await fs.readFile(filename, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // If the file doesn't exist, generate a new DID
    if (error.code === 'ENOENT') {
      const did = await DidDhtMethod.create({ publish: true })
      await fs.writeFile(filename, JSON.stringify(did, null, 2))
      return did
    }
    console.error('Error reading from file:', error)
  }
}