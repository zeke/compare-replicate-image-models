#!/usr/bin/env node

import Replicate from 'replicate'
import { chain } from 'lodash-es'
import { writeFile } from 'node:fs/promises'
import numeral from 'numeral'

const replicate = new Replicate()

const collection = await replicate.collections.get('text-to-image')

const models = await Promise.all(
  collection.models.map(async ({ name, owner }) => {
    return replicate.models.get(owner, name)
  })
)

const mostRunModels = chain(models)
  .orderBy('run_count', 'desc')
  .value()

await writeFile('models.json', JSON.stringify(mostRunModels, null, 2))

console.log(`
# Comparing Image Generation Models on Replicate

This is a repo for comparing API interfaces and features of image generation models on Replicate.

The models: https://replicate.com/collections/text-to-image

Interpreting this table:

- Prompt: Does the model have an input called \`prompt\`?
- img2img: Does the model have an input called \`image\`?
- Mask: Does the model have an input called \`mask\`?
- Aspect Ratio: Does the model have an input called \`aspect_ratio\`?
- Multi-output: Does the model return multiple outputs, or just one?

---

Model | Runs | Prompt | img2img | Mask | Aspect Ratio | Multi-output
----- | ---- | ------ | ------- | ---- | ------------ | ------------`)

for (const model of mostRunModels) {
  const input = model.latest_version.openapi_schema.components.schemas.Input.properties
  const output = model.latest_version.openapi_schema.components.schemas.Output
  const mask = Object.keys(input).some(key => key.toLowerCase().includes('mask'))
  const aspectRatio = Object.keys(input).some(key => key.toLowerCase().includes('aspect') && key.toLowerCase().includes('ratio'))

  const multipleOutput = output.type === 'array'

  console.log([
    `[${model.name}](${model.url})`,
    numeral(model.run_count).format('0.0a'),
    input.prompt ? '✅' : '❌',
    input.image ? '✅' : '❌',
    mask ? '✅' : '❌',
    aspectRatio ? '✅' : '❌',
    multipleOutput ? '✅' : '❌'
  ].join(' | '))
}
