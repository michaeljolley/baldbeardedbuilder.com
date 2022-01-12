---
date: 2020-01-13
title: "Using AutoMapper with ASP.NET Core 3"
cover: ./cover-image.png
banner_image_alt: Metamorphosis of a butterfly with the .NET core and AutoMapper logos
description: How to map objects to one another in ASP.NET Core 3 applications with AutoMapper.
tags: [csharp, automapper, dotnet, aspnetcore]
canonical_url: "https://baldbeardedbuilder.com/posts/using-automapper-with-dotnetcore-3/"
---

[AutoMapper] is well known in the .NET community. It bills itself as "a simple little library built
to solve a deceptively complex problem - getting rid of code that maps one object to another,"
and it does the job nicely.

In the past, I've used it exclusively with ASP.NET APIs. However, the method for utilizing it via
dependency injection has changed. So let's review how to get started, how to define mappings and
how to inject our mappings into ASP.NET Core APIs.

<!--more-->

## Getting Started

Like most .NET libraries, we can install the `AutoMapper` package from Nuget.

```powershell
Install-Package AutoMapper
```

For our purposes, we'll focus on two classes that are related; `User` and `UserDTO`.

```csharp

public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string FavoriteFood { get; set; }
    public DateTime BirthDate { get; set; }
}

public class UserDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public int BirthYear { get; set; }
}

```

These classes will serve as source and destination types that we can work with.

## Default Mappings

Without specific configuration, AutoMapper will match properties based on their name. 
By default, it will ignore null reference exceptions when mapping source and destination 
types. Below is a snippet mapping the source and destination types using the default 
configuration.

```csharp

var config = new MapperConfiguration(cfg => cfg.CreateMap<User, UserDTO>());

var user = new User() 
{
    Id = Guid.NewGuid(),
    Name = "Joe Bruiser",
    FavoriteFood = "Curry",
    BirthDate = new DateTime(2000, 10, 12)
};

var mapper = config.CreateMapper();
UserDTO userDTO = mapper.Map<UserDTO>(user);

```

The above will create a `UserDTO` object with an `Id` and `Name` that matches the original 
`user` object, but no error is thrown as a result of not having the `FavoriteFood` property 
on the `UserDTO` type. Also, the `BirthYear` property of the `UserDTO` will be zero.

## Custom Mappings

We can use projection to translate properties as they are mapped. For instance, the code snippet 
below shows how we can map the `BirthDate` property of the `User` type to the `BirthYear` 
property of the `UserDTO` type.

```csharp

var config = new MapperConfiguration(cfg =>
    cfg.CreateMap<User, UserDTO>()
        .ForMember(dest => dest.BirthYear, 
                   opt => opt.MapFrom(src => src.BirthDate.Year));

var user = new User() 
{
    Id = Guid.NewGuid(),
    Name = "Joe Bruiser",
    FavoriteFood = "Curry",
    BirthDate = new DateTime(2000, 10, 12)
};

var mapper = config.CreateMapper();
UserDTO userDTO = mapper.Map<UserDTO>(user);

```

The resulting `userDTO` object will be similar to our first example, but this time it will  
include the `BirthYear` property of 2000.

## Profiles

A clean way to organize and maintain our mapping configurations is with profiles. Many 
times these `Profile` classes will encapsulate business areas (e.g. Ordering, Shipping). To 
start, we'll create a class that inherits from `Profile` and put the configuration in the 
constructor.

```csharp
public class UserManagementProfile : Profile
{
    public UserManagementProfile()
    {
        CreateMap<User, UserDTO>()
            .ForMember(dest => dest.BirthYear, 
            opt => opt.MapFrom(src => src.BirthDate.Year));

        // Configurations for other classes in this business 
        // area can be included here as well, like below:

        // CreateMap<Role, RoleDTO>();
        // CreateMap<Permission, PermissionDTO>();
    }
}
```

For added isolation, we can create a project just for our `Profile` configurations. Using 
profiles helps us keep configurations more manageable as our application grows.

## Dependency Injection

Dependency injection is baked into ASP.NET Core, but to use AutoMapper with it we'll need 
additional configuration and an additional Nuget package.  

```powershell
Install-Package AutoMapper.Extensions.Microsoft.DependencyInjection
```

## Register AutoMapper

Once installed, we can define the configuration using profiles. In the `Startup.ConfigureServices` 
method, we can use the `AddAutoMapper` extension method on the `IServiceCollection` object as 
shown below:

```csharp
// By Marker
services.AddAutoMapper(typeof(ProfileTypeFromAssembly1) /*, ...*/);

// or by Assembly
services.AddAutoMapper(profileAssembly1, profileAssembly2 /*, ...*/);
```

## Inject AutoMapper

With AutoMapper registered and its configurations set, we can now inject an `IMapper` into 
our controllers.

```csharp

public class UsersController
{
    private readonly IMapper _mapper;

    public UsersController(IMapper mapper) => _mapper = mapper;

    // use _mapper.Map
}

```

With the `IMapper` we can map our objects to their DTO equivalents using the `.Map` 
method.

## Wrap It Up

Now that ASP.NET Core is injecting AutoMapper to our controllers, we can add configurations 
to our profiles or create new profiles for new business areas and still map appropriately 
without further configuration.  

Of course, we didn't cover all of the features of AutoMapper so I'd suggest checking out their documentation for more information about their capabilities.  Hopefully this post gave you 
enough information to start trying AutoMapper yourself.  Let me know how you 
use AutoMapper in your applications.

[automapper]: https://automapper.org/
