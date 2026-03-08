# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#app-content"
  - main [ref=e3]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - heading "Sign in" [level=3] [ref=e8]
        - paragraph [ref=e9]: Welcome back. Please enter your credentials.
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e15]: Email Address
          - textbox "Email Address" [ref=e16]:
            - /placeholder: name@example.com
            - text: admin@example.com
        - generic [ref=e17]:
          - generic [ref=e20]: Password
          - textbox "Password" [ref=e21]:
            - /placeholder: ••••••••
            - text: admin123
        - button "Sign In" [disabled]:
          - img
          - text: Sign In
      - generic [ref=e22]:
        - paragraph [ref=e23]:
          - text: Don't have an account?
          - link "Create one" [ref=e24] [cursor=pointer]:
            - /url: /auth/register
        - link "← Back to storefront" [ref=e25] [cursor=pointer]:
          - /url: /
  - alert [ref=e26]
```