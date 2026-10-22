// Football Universe Copilot — lean hackathon deployment (one resource group).
// Pay-per-use only: Functions Consumption, Microsoft Phi-4-mini-instruct on Foundry,
// Cosmos DB Gremlin serverless. No fixed-floor services.
param location string = 'westus2'
param nameSuffix string = uniqueString(resourceGroup().id)

var prefix = 'fuc'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: '${prefix}st${nameSuffix}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    // The 'media' container below is intentionally public-read so the demo site can
    // stream the friendly-tour video. Everything else on this account stays private:
    // public access is granted per-container, and only 'media' opts in.
    allowBlobPublicAccess: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

// Public-read container for site media (the friendly-tour video, 1080p + 4K).
// Blobs are uploaded out of band — see infra/MEDIA-HANDOFF.md.
resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'media'
  properties: {
    publicAccess: 'Blob'
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${prefix}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
  kind: 'linux'
}

resource foundry 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${prefix}-foundry-${nameSuffix}'
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'AIServices'
  properties: {
    publicNetworkAccess: 'Enabled'
    customSubDomainName: '${prefix}-foundry-${nameSuffix}'
  }
}

// Microsoft's own model — the narrator. Format 'Microsoft' per the Foundry model catalog.
// (No GPT fallback deployment: the 2024-07-18 gpt-4o-mini version is deprecated for new
// deployments as of Oct 2026; the narrator's deterministic template is the fallback.)
resource phiModel 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: foundry
  name: 'Phi-4-mini-instruct'
  sku: {
    name: 'GlobalStandard'
    capacity: 1
  }
  properties: {
    model: {
      format: 'Microsoft'
      name: 'Phi-4-mini-instruct'
      version: '1'
    }
  }
}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: '${prefix}-cosmos-${nameSuffix}'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [
      {
        name: 'EnableGremlin'
      }
      {
        name: 'EnableServerless'
      }
    ]
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

resource gremlinDb 'Microsoft.DocumentDB/databaseAccounts/gremlinDatabases@2024-11-15' = {
  parent: cosmos
  name: 'FootballUniverse'
  properties: {
    resource: {
      id: 'FootballUniverse'
    }
  }
}

resource gremlinGraph 'Microsoft.DocumentDB/databaseAccounts/gremlinDatabases/graphs@2024-11-15' = {
  parent: gremlinDb
  name: 'FootballGraph'
  properties: {
    resource: {
      id: 'FootballGraph'
      partitionKey: {
        paths: [
          '/pk'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource funcApp 'Microsoft.Web/sites@2023-12-01' = {
  name: '${prefix}-api-${nameSuffix}'
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'python'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: insights.properties.InstrumentationKey
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: foundry.properties.endpoint
        }
        {
          name: 'AZURE_OPENAI_DEPLOYMENT'
          value: 'Phi-4-mini-instruct'
        }
        // AZURE_OPENAI_API_KEY: set from the portal/Key Vault after deploy — never in source.
      ]
    }
  }
}

output functionAppName string = funcApp.name
output mediaBaseUrl string = 'https://${storage.name}.blob.core.windows.net/media'
output openaiEndpoint string = foundry.properties.endpoint
output cosmosEndpoint string = cosmos.properties.documentEndpoint
