// node --test scripts/migrate/content-dates.test.mjs
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {contentDate, replacedShare, stampContentDates} from './content-dates.mjs'

const WORDS = Array.from({length: 100}, (_, i) => `w${i}`)
const post = (words, heading = 'Intro', extra = {}) => ({
  _id: 'p1',
  _type: 'post',
  title: 'Title',
  slug: {current: 'p'},
  body: [
    {_type: 'block', _key: 'a', style: 'h2', children: [{_type: 'span', text: heading}]},
    {_type: 'block', _key: 'b', style: 'normal', children: [{_type: 'span', text: words.join(' ')}]},
  ],
  ...extra,
})
const day = (d) => `2026-10-${d}T19:00:00Z`

test('a post never changed materially has no updatedAt, and an unchanged run changes nothing', () => {
  const first = post(WORDS)
  const {baseline} = stampContentDates([first], {}, day(17))
  assert.equal(first.updatedAt, undefined)
  const again = post(WORDS)
  const next = stampContentDates([again], baseline, day(18))
  assert.equal(again.updatedAt, undefined)
  assert.deepEqual(next.baseline, baseline)
})

test('small edits add up: three 2% edits date the post on the third run', () => {
  let {baseline} = stampContentDates([post(WORDS)], {}, day(16))
  let words = [...WORDS]
  for (const run of [1, 2, 3]) {
    words = words.map((w, i) => (i >= (run - 1) * 2 && i < run * 2 ? `x${i}` : w))
    const doc = post(words)
    baseline = stampContentDates([doc], baseline, day(16 + run)).baseline
    assert.equal(doc.updatedAt, run < 3 ? undefined : day(19), `run ${run}`)
  }
})

test('a heading added or removed, or an FAQ change, is material; a title or SEO change is not', () => {
  let {baseline} = stampContentDates([post(WORDS)], {}, day(16))
  const retitled = post(WORDS, 'Intro', {title: 'New title', seo: {_type: 'seo', description: 'New meta'}})
  baseline = stampContentDates([retitled], baseline, day(17)).baseline
  assert.equal(retitled.updatedAt, undefined)
  const added = post(WORDS)
  added.body.push({_type: 'block', _key: 'c', style: 'h3', children: [{_type: 'span', text: 'More'}]})
  baseline = stampContentDates([added], baseline, day(18)).baseline
  assert.equal(added.updatedAt, day(18))
  const faqd = post(WORDS, 'Intro', {faqs: [{_key: 'f', question: 'Q?', answer: []}]})
  faqd.body.push(added.body[2])
  stampContentDates([faqd], baseline, day(19))
  assert.equal(faqd.updatedAt, day(19))
})

test('a reworded heading counts only through its words', () => {
  const {baseline} = stampContentDates([post(WORDS, 'Ready to Get Started?')], {}, day(16))
  // the closing call to action retitled: 4 of 104 words, under 5%
  const light = post(WORDS, 'Get a Recessed Lighting Estimate')
  stampContentDates([light], baseline, day(17))
  assert.equal(light.updatedAt, undefined)
  // with enough other words replaced, the same retitle is material
  const heavy = post(WORDS.map((w, i) => (i < 2 ? `x${i}` : w)), 'Get a Recessed Lighting Estimate')
  stampContentDates([heavy], baseline, day(17))
  assert.equal(heavy.updatedAt, day(17))
})

test('a page keeps its date through a light touch and a new one is dated today', () => {
  const page = (text) => ({_id: 'pg', _type: 'page', heading: 'H1', sections: [{_type: 's', _key: 'k', heading: 'Section', text}]})
  const baseline = stampContentDates([page('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one')], {}, day(17)).baseline
  const touched = page('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-two')
  stampContentDates([touched], baseline, day(20))
  assert.equal(touched.updatedAt, day(17))
})

test('replaced share counts a swapped word once', () => {
  assert.equal(replacedShare('a:1 b:1 c:1 d:1', 'a:1 b:1 c:1 e:1'), 0.25)
  assert.equal(replacedShare('a:2', 'a:2'), 0)
})

test('the date is the Arizona day, at noon there', () => {
  assert.equal(contentDate({}, new Date('2026-10-18T06:59:00Z')), day(17))
  assert.equal(contentDate({}, new Date('2026-10-18T07:00:00Z')), day(18))
  assert.equal(contentDate({CONTENT_DATE: '2026-10-17'}, new Date('2026-12-01T00:00:00Z')), day(17))
  assert.throws(() => contentDate({CONTENT_DATE: 'tomorrow'}))
})
