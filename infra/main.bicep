// Football Universe Copilot — lean hackathon deployment (one resource group).
// Deliberately minimal for cost: Functions Consumption (pay-per-use + free grant),
// Azure OpenAI gpt-4o-mini (pay-per-token), Cosmos DB Gremlin SERVERLESS (pay-per-RU).
// No AI Search, no Container Apps, no Premium plans — nothing with a fixed monthly floor.
param location string = 'eastus'
param nameSuffix string = uniqueString(resourceGroup().id)
var prefix = 'fuc'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: '${prefix}st${nameSuffix}' location: location sku: { name: 'Standard_LRS' } kind: 'StorageV2'
}
resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-insights' location: location kind: 'web' properties: { Application_Type: 'web' }
}
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${prefix}-plan' location: location sku: { name: 'Y1' tier: 'Dynamic' } properties: { reserved: true } kind: 'linux'
}
resource openai 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${prefix}-foundry-${nameSuffix}' location: location sku: { name: 'S0' } kind: 'AIServices'
  properties: { publicNetworkAccess: 'Enabled' }
}
resource model 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openai name: 'gpt-4o-mini'
  sku: { name: 'GlobalStandard' capacity: 10 }
  properties: { model: { format: 'OpenAI' name: 'gpt-4o-mini' version: '2024-07-18' } }
}
// Microsoft's own model — PRIMARY narrator. Format 'Microsoft' per Foundry model catalog.
resource phiModel 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openai name: 'Phi-4-mini-instruct'
  dependsOn: [ model ]
  sku: { name: 'GlobalStandard' capacity: 1 }
  properties: { model: { format: 'Microsoft' name: 'Phi-4-mini-instruct' version: '1' } }
}
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: '${prefix}-cosmos-${nameSuffix}' location: location kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [ { name: 'EnableGremlin' } { name: 'EnableServerless' } ]
    locations: [ { locationName: location failoverPriority: 0 } ]
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
  }
}
resource gremlinDb 'Microsoft.DocumentDB/databaseAccounts/gremlinDatabases@2024-11-15' = {
  parent: cosmos name: 'FootballUniverse'
  properties: { resource: { id: 'FootballUniverse' } }
}
resource gremlinGraph 'Microsoft.DocumentDB/databaseAccounts/gremlinDatabases/graphs@2024-11-15' = {
  parent: gremlinDb name: 'FootballGraph'
  properties: { resource: { id: 'FootballGraph' partitionKey: { paths: [ '/label' ] kind: 'Hash' } } }
}
resource funcApp 'Microsoft.Web/sites@2023-12-01' = {
  name: '${prefix}-api-${nameSuffix}' location: location kind: 'functionapp,linux'
  properties: {
    serverFarmId: plan.id httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      appSettings: [
        { name: 'AzureWebJobsStorage' value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value}' }
        { name: 'FUNCTIONS_EXTENSION_VERSION' value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME' value: 'python' }
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY' value: insights.properties.InstrumentationKey }
        { name: 'AZURE_OPENAI_ENDPOINT' value: openai.properties.endpoint }
        { name: 'AZURE_OPENAI_DEPLOYMENT' value: 'Phi-4-mini-instruct' }
        // AZURE_OPENAI_API_KEY: set from Key Vault / portal after deploy — never in source.
      ]
    }
  }
}
output functionAppName string = funcApp.name
output openaiEndpoint string = openai.properties.endpoint
output cosmosEndpoint string = cosmos.properties.documentEndpoint
