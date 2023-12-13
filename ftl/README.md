# tbdex-pfi-exemplar/ftl

## Getting Started

### 1. Activate [Hermit](https://cashapp.github.io/hermit/usage/get-started/)

> [!NOTE]
>
> You can skip this step if you have [shell_hooks](https://cashapp.github.io/hermit/usage/shell/) installed to automatically activate hermit environments

```shell
source ./bin/activate-hermit
```

### 2. Start your FTL cluster 

```shell
ftl serve 
```

> [!NOTE]
>
> `ftl serve --recreate` will recreate the FTL cluster from a fresh state, i.e. delete all deployed modules

### 3. In a new shell, start the development server

> [!NOTE]
>
> This will begin hot-reloading (watching for any code changes, and automatically re-deploying)
>
> Alternatively, if you don't want to hot-reload, you can manually deploy FTL modules using the `ftl deploy` command (ex: `ftl deploy ftl-module-offerings`)

```shell
ftl dev .
```

### 4. Go to http://localhost:8892/ in your web browser