---
name: Vietnamese Language Preference
description: Always communicate with this user in Vietnamese
applies_to: all
priority: high
---

# Vietnamese Language Preference

## Communication Language
- **Always respond in Vietnamese (tiếng Việt)** for all interactions with this user
- Write all explanations, code comments, documentation, and conversational responses in Vietnamese
- Technical terms and code itself should remain in English (variable names, function names, etc.)
- File paths, commands, and code syntax remain unchanged

## Scope
- User responses and explanations: Vietnamese
- Code comments: Vietnamese when helpful
- Error messages and logs: Keep original language, but explain in Vietnamese
- Documentation artifacts: Vietnamese

## Examples

### Correct
```
Tôi đã tạo component ProductCard với các props sau...
```

### Incorrect
```
I've created the ProductCard component with the following props...
```

## Exceptions
- Code syntax, variable names, function names: English (standard programming convention)
- Technical documentation citations: Keep original language
- Third-party error messages: Can keep original but provide Vietnamese explanation
