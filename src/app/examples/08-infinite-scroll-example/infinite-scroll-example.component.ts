import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, combineLatest, Subject, Subscription } from 'rxjs';
import { filter, scan, takeUntil } from 'rxjs/operators';
import { MatSelect } from '@angular/material/select';

/**
 * Based upon: https://stackblitz.com/edit/mat-select-search-with-infinity-scroll
 */
@Component({
  selector: 'app-infinite-scroll-example',
  templateUrl: './infinite-scroll-example.component.html',
  styleUrls: ['./infinite-scroll-example.component.scss']
})
export class InfiniteScrollExampleComponent implements OnInit, OnDestroy {
  @ViewChild('matSelectInfiniteScroll', { static: true } )
  infiniteScrollSelect: MatSelect;

  // Mocks some sort of backend data source
  mockBankList = Array.from({ length: 1000 }).map((_, i) => `Bank ${i}`);
  private _data = new BehaviorSubject<any[]>(this.mockBankList);
  data$ = this._data.asObservable();

  ctrl: FormControl = new FormControl();
  searchCtrl: FormControl = new FormControl();

  subscriptions: Subscription[] = [];
  _options = new BehaviorSubject([]);
  options$ = this._options.asObservable().pipe(
    scan((acc, curr) => {
      if (!acc || !curr) {
        return [];
      }
      return [...acc, ...curr];
    }, [])
  );
  offset = 0;
  limit = 20;
  /**
   * Holds the option matches
   * a subset of this data is selected
   * using the offset and limit
   */
  data = [];

  /** Subject that emits when the component has been destroyed. */
  protected _onDestroy = new Subject<void>();

  constructor() { }

  ngOnInit() {
    this.data$.pipe(
      takeUntil(this._onDestroy)
    ).subscribe({
      next: (data) => {
        console.log('Ingested data changed');
        this.data = data;
        this.offset = 0;
        this._options.next(null);
        this.getNextBatch();
      }
    });

    const searchValueChange$ = this.searchCtrl.valueChanges;
    const selectOpenChange$ = this.infiniteScrollSelect.openedChange;
    combineLatest([selectOpenChange$, searchValueChange$])
      .pipe(
        filter(([isOpen, _]) => isOpen === true && !this.ctrl.value),
        takeUntil(this._onDestroy)
      )
      .subscribe(([_, value]) => this.onSearchChange(value));

    this.options$
      .pipe(
        takeUntil(this._onDestroy)
      ).
      subscribe((val) => console.log(`New view array contains ${val.length} items`));
  }

  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  onChange(e): void {
    console.log(`Value Changed: ${e}`);
  }

  onSearchChange(e): void {
    console.log(`Search Changed: ${e}`);
    let val = e ? e.trim() : null;
    if (!val) {
      // Empty search, returns everything
      this._data.next(this.mockBankList);
      return;
    } else {
      val = val.toLowerCase();
    }

    const matches = this.mockBankList.filter((i) => i.toLowerCase().indexOf(val.toLowerCase()) > -1);
    this._data.next(matches);
  }

  /**
   * Used for selecting next batch
   * for ngx-infinite-scroll
   */
  getNextBatch(): void {
    const results = this.data.slice(this.offset, this.offset + this.limit);
    this._options.next(results);
    this.offset += this.limit;
  }
}