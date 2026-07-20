'use client'

import { useState } from 'react'
import { Card, Textarea, Button } from '@/lib/ui'
import { saveTerms } from './actions'

export function TermsEditor({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const result = await saveTerms(text)
    setSaving(false)
    setMessage(result.success ? 'Saved.' : result.error)
  }

  return (
    <Card title="Terms & Conditions">
      <Textarea value={text} onChange={e => setText(e.target.value)} rows={8} />
      {message && <p className="mt-2 text-sm text-teal">{message}</p>}
      <div className="mt-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Card>
  )
}
