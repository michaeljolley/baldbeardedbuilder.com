---
date: 2019-11-24
title: "Environment Variables in Azure Functions with Key Vault"
cover: ./69502090-f4b96a80-0ed0-11ea-95fd-8c51ac152b14_mukvtv.jpg
banner_image_alt: Azure Key Vault, App Service and Function logos on a background of the Azure portal.
description: Accessing environment variables from your Azure Key Vault is simple for normal Azure App Services, but a little more involved for Azure Function App Services.
tags: [azure, key-vault, functions]
---

While working on a project that used a mixture of Azure App Services and Functions, I needed to use environment variables. Having read about Azure Key Vault, I knew that it held all the answers (or secrets.)

Some quick Google-Fu later and my Node.js apps running in App Services were accessing environment variables with `process.env.{secret}`. Using this newfound knowledge, and to no avail, I tried to give the same access to my Azure Functions running in App Services.

After much web (and soul) searching, I found the solution and would love to share it for the benefit of future generations.

<!--more-->

### Azure Key Vault

The Azure Key Vault supplies a way to store keys and secrets outside of the context of an application. Using access policies, you can allow your applications to access and/or manage the keys within the vault. You can include any secrets, from API keys to connection strings, in your vault.

### Accessing Secrets as Environment Variables

To access Key Vault secrets as environment variables in your Azure App Service, you will need to setup an Access Policy.

<v-image
  alt="Identity blade of Azure app service in portal"
 src="./69500724-393e0980-0ec3-11ea-8ac5-c859956c3a12_tylwgx.jpg"></v-image>

To do this, go to the Identity menu option in your App Service and access the "System assigned" tab.

Set the "Status" control to "On" and press Save. This will register your app service with the Azure Active Directory. Now you can create an access policy for your App Service in the Key Vault.

<v-image
  alt="Azure Key Vault's Access Policies blade"
 src="./69500821-2ed03f80-0ec4-11ea-959c-94e540cfa40f_qlsmbm.jpg"></v-image>

Open your Key Vault and go to the "Access policies" setting. Once there, click "+ Add Access Policy."

On the add access policy page, set any permissions for keys, secrets and/or certificates. If you only want secrets added as environment variables, you can simply supply the "Get" permission for "Secret permissions."

<v-image
  alt="Add access policy window within Azure portal"
 src="./69501029-82438d00-0ec6-11ea-825d-c346edc624d4_lynncg.jpg"></v-image>

In the "Select principal" option, search for your App Service's name and select it. Next, press the "Add" button to add the policy and then "Save" on the Access Policies page to commit the changes.

Your App Service can now access your secrets as environment variables.

### Wait!?! My Azure Function's App Service cannot see the Environment Variables

Correct. Welcome to the dilemma this post is destined to solve.

The steps above are needed, but there are a few more steps to access your key vault secrets within Azure Function App Services.

First, decide what specific secrets you want your Function App Service to access. Then, find that secret in your key vault and copy its Secret Identifier. It will look like: `https://myvault.vault.azure.net/secrets/MYVARIABLE/SECRETKEYHERE`.

### Configuring AppSettings to Access Key Vault Secrets

In your Function App Service, click on "Configuration" and add a new application setting. Give it the name you want to access as an environment variable. In the "value" field, enter the following:

```
@Microsoft.KeyVault(SecretUri={SECRET IDENTIFIER URL FROM KEY VAULT})
```

Finally, press "OK" and "Save" to commit the new setting.

You can now access that secret as an environment variable from within your Azure Function.

### Wrap it up

Hopefully, this quick walk-through helps save you time in the future when trying to fight this battle yourself.
