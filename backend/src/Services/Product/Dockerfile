FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Shared/Profitzen.Common/Profitzen.Common.csproj", "src/Shared/Profitzen.Common/"]
COPY ["src/Services/Product/Profitzen.Product.csproj", "src/Services/Product/"]
RUN dotnet restore "src/Services/Product/Profitzen.Product.csproj"
COPY . .
WORKDIR "/src/src/Services/Product"
RUN dotnet build "Profitzen.Product.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Profitzen.Product.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Profitzen.Product.dll"]
