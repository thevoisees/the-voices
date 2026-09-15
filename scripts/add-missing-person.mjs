#!/usr/bin/env node
/**
 * Merge a downloaded missing-person JSON (+ its JPG) into public/missing/.
 *
 * Usage:
 *   node scripts/add-missing-person.mjs path/to/{id}.json [path/to/{id}.jpg]
 *
 * Then commit and push so GitHub Pages serves the photo.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const missingDir = join(root, 'public', 'missing')
const photosDir = join(missingDir, 'photos')
const catalogPath = join(missingDir, 'people.json')

const jsonPath = process.argv[2]
const photoArg = process.argv[3]

if (!jsonPath) {
  console.error('Usage: node scripts/add-missing-person.mjs <person.json> [photo.jpg]')
  process.exit(1)
}

const entry = JSON.parse(readFileSync(resolve(jsonPath), 'utf8'))
if (!entry.id || !entry.name) {
  console.error('JSON must include id and name')
  process.exit(1)
}

mkdirSync(photosDir, { recursive: true })
const photoName = `${entry.id}.jpg`
const photoDest = join(photosDir, photoName)

const photoSrc =
  photoArg ||
  join(dirname(resolve(jsonPath)), photoName)

if (existsSync(photoSrc)) {
  copyFileSync(photoSrc, photoDest)
  console.log('Photo →', photoDest)
} else {
  console.warn('No photo file found at', photoSrc, '— add it manually to public/missing/photos/')
}

entry.photo = `./missing/photos/${photoName}`
entry.source = 'github'

let catalog = []
if (existsSync(catalogPath)) {
  catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
}
catalog = catalog.filter((p) => p.id !== entry.id)
catalog.unshift(entry)
writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n')
console.log('Updated', catalogPath)
console.log('Next: git add public/missing && git commit && git push')
