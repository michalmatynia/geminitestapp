---
owner: 'Platform Team'
last_reviewed: '2026-05-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Clusters Scan

Generated at: 2026-05-16T12:47:29.939Z

## Summary

- Files scanned: 13429
- Exported declarations: 8244
- Candidate declarations: 8225
- Exact shape clusters: 94
- Near shape clusters: 50
- Highest risk score: 68

## Top Clusters

| ID | Kind | Risk | Decls | Domains | Preview |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0001` | exact-shape | 68 | 21 | feature:filemaker | `Record<string, string>` |
| `exact-0002` | exact-shape | 37 | 7 | feature:filemaker, feature:playwright, feature:products | `prop:label:string; prop:value:string` |
| `near-0001` | near-shape | 37 | 7 | feature:filemaker, feature:playwright, feature:products | `prop:label:string; prop:value:FilemakerLexiconTermCategory` |
| `near-0002` | near-shape | 34 | 4 | feature:filemaker | `prop:background:string; prop:children:CvBlock[]; prop:kind:'section'; prop:label:string; prop:paddingX:number; prop:paddingY:number` |
| `exact-0003` | exact-shape | 31 | 7 | feature:filemaker | `'event' | 'organization' | 'person'` |
| `near-0004` | near-shape | 31 | 3 | feature:filemaker | `prop:children:CvLeafBlock[]; prop:gap:number; prop:kind:'stack'; prop:label:string` |
| `near-0023` | near-shape | 30 | 2 | feature:filemaker, shared:contracts | `prop:combinator:OrganizationAdvancedFilterCombinator; prop:id:string; prop:not:boolean; prop:rules:Array<OrganizationAdvancedFilterCondition | OrganizationAdvancedFilterGroup>; prop:type:'group'` |
| `exact-0064` | exact-shape | 28 | 2 | feature:kangur | `ReturnType<typeof useTranslations>` |
| `exact-0085` | exact-shape | 28 | 2 | shared:contracts | `z.infer<typeof productListingSchema>` |
| `exact-0086` | exact-shape | 28 | 2 | shared:contracts | `z.infer<typeof playwrightRelistBrowserModeSchema>` |
| `exact-0056` | exact-shape | 24 | 2 | feature:filemaker | `FilemakerPerson & { checked1?: boolean; checked2?: boolean; dateOfBirth?: string; fullName: string; legacyDefaultAddressUuid?: string; legacyDefaultBankAccountU` |
| `exact-0004` | exact-shape | 23 | 6 | feature:filemaker | `'all' | 'with_address' | 'without_address'` |
| `near-0003` | near-shape | 20 | 3 | feature:filemaker | `prop:items:string[]; prop:kind:'skills'; prop:label:string` |
| `exact-0077` | exact-shape | 19 | 2 | feature:products | `prop:artifactKey:string | null; prop:asin:string | null; prop:heroImageAlt:string | null; prop:heroImageArtifactName:string | null; prop:heroImageUrl:string | null; prop:id:string | null; prop:marketplaceDomain:string | null; prop:matchedImageId:string | null` |
| `near-0006` | near-shape | 19 | 2 | app, shared:contracts | `prop:debounceMs:number; prop:flags:string | null; prop:index:number; prop:length:number; prop:matchText:string; prop:message:string; prop:patternId:string; prop:postAcceptBehavior:ProductValidationPostAcceptBehavior` |
| `exact-0008` | exact-shape | 18 | 3 | feature:ai, feature:products | `Toast` |
| `exact-0009` | exact-shape | 18 | 3 | feature:filemaker | `prop:label?:string; prop:legacyValueUuid:string; prop:level:number; prop:parentId?:string | null; prop:valueId?:string` |
| `exact-0015` | exact-shape | 18 | 3 | feature:internationalization, feature:notesapp, feature:products | `prop:confirmText?:string; prop:isDangerous?:boolean; prop:message:string; prop:onConfirm:() => void | Promise<void>; prop:title:string` |
| `near-0011` | near-shape | 18 | 2 | feature:filemaker, shared | `prop:kind:'summary'; prop:text:string` |
| `exact-0010` | exact-shape | 17 | 3 | feature:filemaker | `prop:applicationEmailVersionId:string | null; prop:coverLetterVersionId:string | null; prop:tailoredCvVersionId:string | null` |
| `exact-0071` | exact-shape | 17 | 2 | feature:playwright, shared | `prop:id:string; prop:name:string` |
| `near-0007` | near-shape | 17 | 2 | feature:ai | `prop:dependsOn?:number[] | string[] | null | undefined; prop:expectedObservation?:string | null | undefined; prop:goalId?:string | null | undefined; prop:phase?:string | null | undefined; prop:priority?:number | null | undefined; prop:subgoalId?:string | null | undefined; prop:successCriteria?:string | null | undefined; prop:title?:string` |
| `near-0009` | near-shape | 17 | 2 | feature:ai, feature:products | `prop:kind?:string | null; prop:mimeType?:string | null; prop:name:string; prop:path:string` |
| `exact-0006` | exact-shape | 16 | 4 | feature:filemaker | `'all' | 'with_bank' | 'without_bank'` |
| `exact-0016` | exact-shape | 16 | 3 | feature:playwright, feature:products | `Record<string, unknown>` |
