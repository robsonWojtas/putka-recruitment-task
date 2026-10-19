# NOTES

## Założenia i decyzje techniczne

- Jeden sklep może mieć jedno zamówienie na daną datę dostawy. Produkt może wystąpić w nim tylko raz.
- Cutoff to 14:00 czasu `Europe/Warsaw` dnia poprzedzającego dostawę. Dokładnie o 14:00 zamówienie jest już odrzucane.
- Cena produktu jest kopiowana do pozycji zamówienia, aby zachować wartość historyczną.
- Zamówienie jest zapisywane jednym `commit`; błąd integralności powoduje `rollback`.
- Plan obejmuje wszystkie produkty, również nieaktywne, i pokazuje `0` przy braku zamówień.
- Data dostawy i data planu są niezależne. Formularz zamówienia dodałem jako opcjonalne rozszerzenie widoku.
- Bonus z Redisem został świadomie pominięty.

## Jak uruchomić

- Aplikacja: `docker compose up --build`.
- Frontend: http://localhost:5173, API i Swagger: http://localhost:8000/docs.
- Testy: `docker compose exec backend pytest`.
- Tabele i dane startowe tworzą się automatycznie podczas startu backendu.

## Przyczyna czerwonego testu

- Co było źle: cutoff zapisano jako stałe `12:00 UTC`. Odpowiada to 14:00 w Warszawie latem, ale zimą oznacza 13:00.
- Dlaczego test to wyłapał: zamówienie składane zimą o 13:30 było błędnie odrzucane.
- Jak to naprawiłem: tworzę cutoff jako 14:00 w strefie `Europe/Warsaw`, a następnie przeliczam go na UTC. `zoneinfo` uwzględnia zmianę czasu.

## Jak korzystałem z AI

- Narzędzie: Codex. Używałem go do analizy repozytorium, planowania etapów, implementacji i przygotowania testów.
- Każdy etap przeglądałem przed wdrożeniem, a wynik sprawdzałem testami, buildem i ręcznie w przeglądarce.
- Przykładowe skrócone prompty:
  - „Przeanalizuj repozytorium i wymagania. Nie wprowadzaj jeszcze zmian.”
  - „Zaplanuj i zaimplementuj modele zamówienia z ograniczeniami oraz ceną historyczną.”
  - „Dodaj `POST /orders` z cutoffem warszawskim, aktywnymi produktami i jedną transakcją.”
  - „Znajdź rzeczywistą przyczynę czerwonego testu dla zimowego cutoffu.”
  - „Dodaj plan produkcji z agregacją i produktami bez zamówień.”
  - „Dodaj testy przypadków brzegowych cutoffu i agregacji planu.”

## Co zweryfikowałem ręcznie

- Działanie aplikacji uruchomionej przez Docker Compose.
- Niezależne działanie daty dostawy i daty planu oraz ograniczenie minimalnej daty dostawy.
- Wyświetlanie produktów pogrupowanych według kategorii, również z ilością `0`.
- Stany ładowania i błędu oraz brak błędów w konsoli przeglądarki.
- Build frontendu uruchomiony w kontenerze oraz pełny zestaw testów backendu: `16 passed`.

## Gdzie AI się pomyliło / co poprawiłem

- Pierwsza wersja frontendu używała jednej daty dla zamówienia i planu. Po przeglądzie rozdzieliłem te dwa pola.
- Osobna lista aktywnych produktów powielała dane formularza, więc została usunięta.
- Pierwsza propozycja interfejsu była bardziej rozbudowana, niż wymagało zadanie. Po review ograniczyłem zakres.

## Co dalej przy większej ilości czasu

- Uporządkowanie frontendu: podział rozbudowanego formularza na mniejsze komponenty oraz pogrupowanie stylów według komponentów.
- Przyjazne polskie komunikaty dla błędów zwracanych przez API.
- Widok edycji istniejącego zamówienia przed upływem cutoffu.
- Testy komponentów i najważniejszych ścieżek użytkownika we frontendzie.
