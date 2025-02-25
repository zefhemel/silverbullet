#meta

This page compiles some useful things about your space and may also be useful for debugging things.

# Stats
```template
**Total pages:** {{count({page select name})}}
**Total documents:** {{count({document select name})}}
**Total tags:** {{count({tag select name})}}
```

# Active [[!silverbullet.md/Space Script]]
```template
{{#each {space-script}}}
* [[{{ref}}]]
{{/each}}
```

# Active [[!silverbullet.md/Space Style]]
```template
{{#each {space-style}}}
* [[{{ref}}]]
{{/each}}
```

# Active [[!silverbullet.md/Space Config]]
You have space config defined on the following pages:
```template
{{#each {space-config select replace(ref, /@.+/, "") as page}}}
* [[{{page}}]]
{{/each}}
```

Composed, this leads to the following active configuration:
```template
~~~yaml
{{yaml(@config)}}
~~~
```
