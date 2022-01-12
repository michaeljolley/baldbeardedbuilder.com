---
date: 2019-12-25
title: "Adding HATEOAS to an ASP.NET Core API"
cover: ./71390264-4256ef00-25c5-11ea-890b-6614ed7fd9a9_xjzxer.jpg
banner_image_alt: Christmas tree decorations with ASP.NET Core logo
description: Implement simple JSON HATEOAS support to an ASP.NET Core web API
tags: [aspnetcore, hateoas, api, json, dotnet, c#]
---

 > I am insanely thankful to be included in <a href="https://crosscuttingconcerns.com/The-Third-Annual-csharp-Advent" target="_blank">C# Advent</a> this year. This is the 3rd year of C# Advent and I always enjoy the dozens of posts by everyone in the community.  Be sure to follow the link above and check out the other posts and watch `#csadvent` on Twitter for updates.

RESTful APIs are very popular these days. When used consistently, they provide a great way to make our APIs easier 
for users to consume.  But how can we make discovering endpoints and capabilities easier? One way is to implement 
Hypermedia as the Engine of Application State (HATEOAS).  You may have seen HATEOAS used in other APIs without 
realizing it.

<!--more-->

Let's look at two responses from RESTful APIs:

<v-image
  alt="Example code of a JSON result from a RESTful and RESTful + HATEOAS API"
 src="./header-templatssse_uzfqri.jpg"></v-image>

In the example responses, you can see that by adding the `links` property to your object, you can greatly increase the discover-ability of your RESTful APIs.

Let's add a rudimentary implementation of HATEOAS in an ASP.NET Core web API.

## Getting Started

First, download the sample code at <a href="https://github.com/MichaelJolley/aspnetcore-hateoas" target="blank">https://github.com/MichaelJolley/aspnetcore-hateoas</a>.

The solution contains two C# projects: BaldBeardedBuilder.HATEOAS.Lib (Lib) and BaldBeardedBuilder.HATEOAS (API).

### BaldBeardedBuilder.HATEOAS.Lib (Lib)

We're not going to go into much detail about the Lib project, but I want to provide a little context to how it's used. 
Its sole purpose is to provide an example data access layer.  The Lib project contains a small Entity Framework Core DbContext 
with two related DbSets; Clients and Addresses.  The solution will use an in-memory database and will seed it each time you debug.  

### BaldBeardedBuilder.HATEOAS (API)

The API project is where all of our HATEOAS magic happens, but before we get into those details, let's take care of some housekeeping.

As we mentioned previously, we're using an in-memory database for Entity Framework Core (EF).  We're also using AutoMapper to map our EF entities to the API models.  To get those things setup we'll first add an `AutoMapping.cs` file to the root of the API project with the following code:

```csharp

public class AutoMapping : Profile
{
    public AutoMapping()
    {
        CreateMap<Address, AddressModel>();
        CreateMap<Client, ClientModel>();
    }
}

```

This code will create the AutoMapper maps between our EF entities and models.  With that file in place, we'll update our `Startup.cs`'s `ConfigureServices` method with the following:

```csharp

services.AddAutoMapper(typeof(Startup));
services.AddDbContext<BBBContext>(options => 
    options.UseInMemoryDatabase(databaseName: "bbb"));

```

### Preparing Our Models

Before we can add links to our models, we need to define what they look like.  Many times objects will have links that 
allow for navigation to related objects.  You may even see links related to functionality like CRUD and other operations. 
In our example, we'll add links for relational objects, including `_self`. The `_self` link will define the path to that 
specific object.  In the `Models` directory of the API project, let's add a `Link.cs` file with the following class:

```csharp

public class Link
{
    public Link(string href, string rel, string type)
    {
        Href = href;
        Rel = rel;
        Type = type;
    }

    public string Href { get; private set; }
    public string Rel { get; private set; }
    public string Type { get; private set; }
}

```

Next we'll add a base class that our future models will inherit from.  Add a new `RestModelBase.cs` file to the `Models` folder of the API project with the following:

```csharp

public abstract class RestModelBase
{
    public List<Link> Links { get; set; } = new List<Link>();
}

```

With that base class in place, we'll inherit it in our `AddressModel` and `ClientModel` classes.

### Adding a Controller Base Class

We'll handle adding the links to each object in a new `RestControllerBase`.  Add a `RestControllerBase.cs` file to the `Controllers` folder of the API project.  It should inherit from `ControllerBase`.

Now add a constructor that receives an IActionDescriptorCollectionProvider and IMapper as shown below.

```csharp

private readonly IReadOnlyList<ActionDescriptor> _routes;
private readonly IMapper _mapper;

public RestControllerBase(
    IActionDescriptorCollectionProvider actionDescriptorCollectionProvider, 
    IMapper mapper)
{
    _routes = actionDescriptorCollectionProvider.ActionDescriptors.Items;
    _mapper = mapper;
}

```

Next we'll add a method that will create URIs for each link. The `URLLink` method receives the relation as a string that you will specify. Examples would be "_self", "addresses", etc.  It also takes in the name of the route in MVC.  These will be defined later when we build our API controllers.  Finally, the method takes in an object of values that will contain our route values.  Add the following to the `RestControllerBase.cs`.

```csharp

internal Link UrlLink(string relation, string routeName, object values)
{
    var route = _routes.FirstOrDefault(f => 
                            f.AttributeRouteInfo.Name.Equals(routeName));
    var method = route.ActionConstraints.
                            OfType<HttpMethodActionConstraint>()
                            .First()
                            .HttpMethods
                            .First();
    var url = Url.Link(routeName, values).ToLower();
    return new Link(url, relation, method);
}

```

Now we can add methods to generate links for each of our models.  In the repository you'll see two methods, `RestfulAddress` and `RestfulClient`, that do this work.  We'll look through the `RestfulClient` method to describe what we're doing.

```csharp

internal ClientModel RestfulClient(Client client)
{
    ClientModel clientModel = _mapper.Map<ClientModel>(client);

    clientModel.Links.Add(
        UrlLink("all", 
                "GetClients", 
                null));

    clientModel.Links.Add(
        UrlLink("_self", 
                "GetClientAsync", 
                new { id = clientModel.Id }));

    clientModel.Links.Add(
        UrlLink("addresses", 
                "GetAddressesByClient", 
                new { id = clientModel.Id }));

    return clientModel;
}

```

In the `RestfulClient` method above, we take in a Client object and convert it to a ClientModel with AutoMapper.  Then we add links for "all", "_self" and "addresses" paths.  

The "all" relationship will provide a link to our API method that returns all clients.  The "_self" relationship defines where this client can be retrieved from the API. The "addresses" relationship defines where to find the addresses associated with this client. Each of the methods we define in those links ('GetClients', 'GetClientAsync' and 'GetAddressesByClient') will be defined later in our ClientController.

### Adding Controllers

Now that our base controller is done, let's add a `ClientController.cs` that inherits from our `RestControllerBase` class. First, we'll define a constructor and inject everything our base class needs as well as our DbContext.

```csharp

private readonly ILogger<ClientController> _logger;
private readonly BBBContext _bbbContext;

public ClientController(
    ILogger<ClientController> logger, 
    IActionDescriptorCollectionProvider actionDescriptorCollectionProvider, 
    BBBContext bbbContext, 
    IMapper mapper)
    : base(actionDescriptorCollectionProvider, mapper)
{
    _logger = logger;
    _bbbContext = bbbContext;
}

```

Now we can access our database to retrieve data and return it using the `RestfulClient` method of our base class.

```csharp

[HttpGet(Name = "GetClients")]
public IActionResult GetClients()
{
    IEnumerable<Client> clients = _bbbContext.Clients;
    IEnumerable<ClientModel> clientModels = clients
                                            .Select(f => RestfulClient(f));
    
    return Ok(clientModels);
}

[HttpGet("{id}", Name = "GetClientAsync")]
public async Task<IActionResult> GetClientAsync(Guid id)
{
    if (id == Guid.Empty)
    {
        return BadRequest();
    }

    Client client = await _bbbContext.Clients.FindAsync(id);

    if (client == null)
    {
        return NotFound();
    }

    return Ok(RestfulClient(client));
}

[HttpGet("{id}/addresses", Name = "GetAddressesByClient")]
public IActionResult GetAddressesByClient(Guid id)
{
    if (id == Guid.Empty)
    {
        return BadRequest();
    }

    IEnumerable<Address> addresses = _bbbContext.Addresses
                                                .Where(w => 
                                                    w.ClientId.Equals(id));
    IEnumerable<AddressModel> addressModels = addresses
                                                .Select(f => 
                                                    RestfulAddress(f));

    return Ok(addressModels);
}

```

Our `AddressController` will also inherit our `RestControllerBase` and its constructor will match the `ClientController`.  Then we can add the following methods for our `/api/addresses` routes:

```csharp

[HttpGet(Name = "GetAddresses")]
public IActionResult GetAddresses()
{
    IEnumerable<Address> addresses = _bbbContext.Addresses;
    IEnumerable<AddressModel> addressModels = addresses
                                                .Select(f => 
                                                    RestfulAddress(f));
    
    return Ok(addressModels);
}

[HttpGet("{id}", Name = "GetAddressAsync")]
public async Task<IActionResult> GetAddressAsync(Guid id)
{
    if (id == Guid.Empty)
    {
        return BadRequest();
    }

    Address address = await _bbbContext.Addresses.FindAsync(id);

    if (address == null)
    {
        return NotFound();
    }

    return Ok(RestfulAddress(address));
}

```

One thing to notice on these controller methods: each is provided a `Name` attribute.  These names 
correspond to the `routeName`'s we pass into the `UrlLink` method.  The `UrlLink` method will use 
that method's template to generate the URL to that route.

### Wrap It Up

Now that everything is in place, we can run the application and navigate to the `/api/clients` route 
to retrieve a list of clients.  Those clients should have a `links` property with links you can follow 
to retrieve additional data or perform various actions.  

Remember that links don't only have to provide URI's to related data, but can also provide URI's to 
perform tasks.  Some implementations include links for CRUD operations with relations like `client-update`, 
`client-delete`, etc.

Hopefully, this basic implementation of HATEOAS gives you some ideas of how you can implement something 
similar in your own API's to improve their discoverability.  Have any questions or suggestions to improve it? Leave a comment below!
